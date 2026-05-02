import { NextRequest } from "next/server";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { classifyIntent, type ParsedHolding, type ParsedTrade } from "@/lib/intent-router";
import { generateAdvice, detectProfileUpdate } from "@/lib/llm";
import { fetchPrices } from "@/lib/prices";
import { executeUpdateProfile } from "@/lib/tools/update-profile";
import { fetchRecommendations } from "@/lib/recommendations";
import { fetchRebalancePlan } from "@/lib/rebalance";
import type { UserProfile } from "@/lib/profile-summary";

type Activity = { icon: string; text: string };

async function loadProfile(): Promise<UserProfile | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single();
  return (data as UserProfile | null) ?? null;
}

export async function POST(req: NextRequest) {
  const { message } = (await req.json()) as { message: string };
  const activity: Activity[] = [];

  // 1. Save user message.
  await supabase.from("messages").insert({
    user_id: DEMO_USER_ID,
    role: "user",
    content: message,
  });

  activity.push({ icon: "🧭", text: "Reading what you said" });

  // 2. Classify intent.
  const intent = await classifyIntent(message);
  activity.push({ icon: "✨", text: labelForIntent(intent) });

  // 2.5. Detect profile-update statements only when intent is "unclear" — those are the
  // messages where the user is most likely sharing a fact about themselves
  // ("I just got a raise", "I have an emergency fund now"). Skipping this on
  // ask_question / run_scenario / trades saves ~33% of Claude calls per message.
  let appliedUpdate: { field: string; value: string | number } | null = null;
  if (intent.type === "unclear") {
    const detect = await detectProfileUpdate(message);
    if (detect.detected && detect.field && detect.value !== undefined) {
      const result = await executeUpdateProfile(detect.field, String(detect.value));
      if (result.success) {
        appliedUpdate = { field: result.field, value: result.new_value };
        activity.push({
          icon: "📝",
          text: `Updated your profile: ${prettyField(detect.field)}`,
        });
      }
    }
  }

  let response: Record<string, unknown>;

  if (intent.type === "add_holding" || intent.type === "update_holding") {
    const symbols = intent.parsed.map((p) => p.symbol);
    activity.push({ icon: "📈", text: `Pulled live prices for ${symbols.join(", ")}` });
    const prices = await fetchPrices(symbols);

    const enriched = (intent.parsed as Array<ParsedHolding | ParsedTrade>).map((p) => {
      const live = prices.find((px) => px.symbol === p.symbol);
      const livePrice = live?.price ?? 0;
      const userPrice = (p.price as number | null | undefined) ?? null;
      const usePrice = userPrice ?? livePrice;
      return {
        ...p,
        live_price: livePrice,
        name: live?.name ?? p.symbol,
        asset_class: live?.asset_class ?? "equity",
        total: p.shares * (usePrice ?? 0),
      };
    });

    response = {
      kind: "confirmation_request",
      intent_type: intent.type,
      items: enriched,
      message:
        intent.type === "add_holding"
          ? "I'll add these to your portfolio. Confirm?"
          : "I'll record this trade. Confirm?",
      activity,
      profile_updated: !!appliedUpdate,
    };
  } else if (intent.type === "ask_question") {
    activity.push({ icon: "📊", text: "Looking at your investments" });

    const profile = await loadProfile();

    const { data: holdings } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_id", DEMO_USER_ID);

    const symbols = (holdings ?? []).map((h) => h.symbol);
    let prices: Awaited<ReturnType<typeof fetchPrices>> = [];
    if (symbols.length > 0) {
      activity.push({ icon: "📈", text: "Pulled today's prices" });
      prices = await fetchPrices(symbols);
    }

    activity.push({ icon: "🧮", text: "Wrote a plan and double-checked it" });
    const advice = await generateAdvice({
      query: intent.query,
      holdings: (holdings ?? []).map((h) => ({
        symbol: h.symbol,
        shares: parseFloat(h.shares),
        avg_cost_basis: h.avg_cost_basis ? parseFloat(h.avg_cost_basis) : null,
        asset_class: h.asset_class,
      })),
      prices: prices.map((p) => ({
        symbol: p.symbol,
        name: p.name,
        price: p.price ?? null,
        change_pct: p.change_pct,
        asset_class: p.asset_class,
      })),
      profile,
    });

    response = {
      kind: "answer",
      text: advice.text,
      citations: advice.citations,
      confidence: advice.confidence,
      suggested_followups: advice.suggested_followups,
      activity,
      profile_updated: !!appliedUpdate,
    };
  } else if (intent.type === "run_scenario") {
    response = {
      kind: "scenario_redirect",
      scenario_id: intent.scenario_id,
      message: "Let's run that scenario. Switching to the What-If tab…",
      activity,
      profile_updated: !!appliedUpdate,
    };
  } else if (intent.type === "recommend_funds") {
    activity.push({ icon: "🎯", text: "Looking up funds that fit your plan" });
    const profile = await loadProfile();

    const missing: string[] = [];
    if (!profile?.goal_timeline_years) missing.push("timeline");
    if (!profile?.risk_feel) missing.push("risk_feel");

    if (missing.length > 0) {
      response = {
        kind: "answer",
        text:
          "To suggest funds, I need to know your **timeline** and **how you feel about risk**. Tap **Tune my plan** in the top bar to fill those in, then ask me again.",
        citations: [],
        confidence: "high",
        suggested_followups: ["Open Tune my plan", "How am I doing?"],
        activity,
        profile_updated: !!appliedUpdate,
      };
    } else {
      const recs = await fetchRecommendations({
        timeline_years: Number(profile!.goal_timeline_years),
        risk_feel: profile!.risk_feel as string,
        account_type: (profile!.account_type as string | null) ?? null,
        fund_preference: (profile!.fund_preference as string | null) ?? null,
      });

      if ("error" in recs) {
        response = {
          kind: "answer",
          text:
            "I couldn't reach the fund-data service right now. Try again in a moment, or tell me a specific fund you're curious about.",
          citations: [],
          confidence: "low",
          suggested_followups: [],
          activity,
          profile_updated: !!appliedUpdate,
        };
      } else {
        const years = Number(profile!.goal_timeline_years);
        const intro =
          recs.options.length === 0
            ? "I couldn't find any matching funds — that's unusual. Tell me more about what you're looking for."
            : `Based on your ${years}-year timeline and how you feel about risk, here ${
                recs.options.length === 1 ? "is 1 option" : `are ${recs.options.length} options`
              }:`;

        activity.push({ icon: "✨", text: `Picked top ${recs.options.length} matches` });
        response = {
          kind: "recommendation",
          options: recs.options,
          intro_text: intro,
          disclaimer: recs.disclaimer,
          activity,
          profile_updated: !!appliedUpdate,
        };
      }
    }
  } else if (intent.type === "rebalance") {
    activity.push({ icon: "⚖️", text: "Diagnosing your portfolio" });
    const profile = await loadProfile();

    if (!profile?.goal_timeline_years || !profile?.risk_feel) {
      response = {
        kind: "answer",
        text:
          "To build a rebalance plan, I need your **timeline** and **how you feel about risk**. Tap **Tune my plan** in the top bar to fill those in, then ask me to rebalance.",
        citations: [],
        confidence: "high",
        suggested_followups: ["Open Tune my plan", "How am I doing?"],
        activity,
        profile_updated: !!appliedUpdate,
      };
    } else {
      const { data: holdings } = await supabase
        .from("holdings")
        .select("symbol, shares")
        .eq("user_id", DEMO_USER_ID);

      activity.push({ icon: "📈", text: "Pulled live prices for your holdings" });

      const plan = await fetchRebalancePlan({
        holdings: (holdings ?? []).map((h) => ({
          symbol: h.symbol,
          shares: parseFloat(h.shares),
        })),
        timeline_years: Number(profile.goal_timeline_years),
        risk_feel: profile.risk_feel as string,
        monthly_contribution: Number(profile.monthly_contribution ?? 0),
      });

      if (!("phases" in plan) || ("error" in plan && plan.error)) {
        response = {
          kind: "answer",
          text:
            "I couldn't reach the rebalance engine right now. Try again in a moment.",
          citations: [],
          confidence: "low",
          suggested_followups: [],
          activity,
          profile_updated: !!appliedUpdate,
        };
      } else if (plan.phases.length === 0) {
        response = {
          kind: "answer",
          text: plan.plan_summary,
          citations: [],
          confidence: "high",
          suggested_followups: ["How am I doing?", "What if the market drops?"],
          activity,
          profile_updated: !!appliedUpdate,
        };
      } else {
        activity.push({
          icon: "🧮",
          text: `Drafted a ${plan.phases.length}-step plan`,
        });
        const planId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        response = {
          kind: "rebalance_plan",
          plan_id: planId,
          plan_summary: plan.plan_summary,
          diagnosis: plan.diagnosis,
          phases: plan.phases,
          expected_after: plan.expected_after,
          disclaimer:
            plan.disclaimer ??
            "Educational only. Past performance doesn't guarantee future returns. You execute trades in your own brokerage account.",
          intro_text:
            "Here's a plan to spread things out. You execute the trades in your broker — I just help you stay organized.",
          activity,
          profile_updated: !!appliedUpdate,
        };
      }
    }
  } else if (appliedUpdate) {
    // Profile-only update with no other actionable intent.
    response = {
      kind: "answer",
      text: `Got it — I updated **${prettyField(appliedUpdate.field)}** to **${appliedUpdate.value}**. Anything else?`,
      citations: [],
      confidence: "high",
      suggested_followups: ["How am I doing?", "What if the market drops?"],
      activity,
      profile_updated: true,
    };
  } else {
    response = {
      kind: "clarify",
      message:
        "I'm not sure what you meant. You can tell me about your holdings (\"I have 10 shares of Apple\"), record a trade (\"I sold 5 Tesla\"), ask a question (\"how am I doing?\"), or try a scenario (\"what if the market drops?\").",
      activity,
      profile_updated: false,
    };
  }

  await supabase.from("messages").insert({
    user_id: DEMO_USER_ID,
    role: "assistant",
    content: typeof response.text === "string" ? response.text : (response.message as string) ?? "",
    metadata: response,
  });

  return Response.json(response);
}

function labelForIntent(intent: Awaited<ReturnType<typeof classifyIntent>>): string {
  switch (intent.type) {
    case "add_holding":
      return `Heard you want to add ${intent.parsed.length} ${intent.parsed.length === 1 ? "investment" : "investments"}`;
    case "update_holding":
      return `Heard a trade — ${intent.parsed.map((p) => `${p.action} ${p.shares} ${p.symbol}`).join(", ")}`;
    case "ask_question":
      return "Heard a question";
    case "run_scenario":
      return `Heard a what-if (${intent.scenario_id})`;
    case "recommend_funds":
      return "Heard you want fund picks";
    case "rebalance":
      return "Heard you want to rebalance";
    case "unclear":
      return "Couldn't quite parse that";
  }
}

function prettyField(field: string): string {
  const map: Record<string, string> = {
    goal: "your goal",
    goal_timeline_years: "your timeline",
    risk_feel: "how you feel about risk",
    amount_invested: "amount invested",
    monthly_contribution: "monthly contribution",
    income_range: "income range",
    account_type: "account type",
    has_emergency_fund: "emergency fund status",
    fund_preference: "fund preference",
    concerns: "your notes",
  };
  return map[field] ?? field;
}
