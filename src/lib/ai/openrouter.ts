import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import type { GameState } from "~/lib/codenames/types";

export interface AIModel {
  id: string;
  name: string;
  inputCost: number;
  outputCost: number;
  tokenLimit: number;
}

export const ALL_MODELS: AIModel[] = [
  {
    id: "openai/gpt-4o",
    name: "OpenAI: GPT-4o",
    inputCost: 2.5,
    outputCost: 10,
    tokenLimit: 128000,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "OpenAI: GPT-4o-mini",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 128000,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Google: Gemini 2.0 Flash",
    inputCost: 0.1,
    outputCost: 0.4,
    tokenLimit: 1048576,
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Anthropic: Claude Opus 4",
    inputCost: 15,
    outputCost: 75,
    tokenLimit: 200000,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Anthropic: Claude Sonnet 4",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "x-ai/grok-4",
    name: "Grok 4",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 256000,
  },
  {
    id: "x-ai/grok-3-beta",
    name: "xAI: Grok 3 Beta",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 131072,
  },
  {
    id: "google/gemini-2.5-flash-preview-05-20",
    name: "Google: Gemini 2.5 Flash Preview 05-20",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 1048576,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek: DeepSeek V3 0324 (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek: DeepSeek V3 0324",
    inputCost: 0.28,
    outputCost: 0.88,
    tokenLimit: 163840,
  },
  {
    id: "google/gemini-2.5-flash-lite-preview-06-17",
    name: "Google: Gemini 2.5 Flash Lite Preview 06-17",
    inputCost: 0.1,
    outputCost: 0.4,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Google: Gemini 2.5 Flash",
    inputCost: 0.3,
    outputCost: 2.5,
    tokenLimit: 1048576,
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Anthropic: Claude 3.7 Sonnet",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Google: Gemini 2.5 Pro",
    inputCost: 1.25,
    outputCost: 10,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-2.5-flash-preview",
    name: "Google: Gemini 2.5 Flash Preview 04-17",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 1048576,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "OpenAI: GPT-4o-mini",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 128000,
  },
  {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek: R1 0528 (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "mistralai/mistral-nemo",
    name: "Mistral: Mistral Nemo",
    inputCost: 0.01,
    outputCost: 0.011,
    tokenLimit: 131072,
  },
  {
    id: "google/gemini-2.0-flash-lite-001",
    name: "Google: Gemini 2.0 Flash Lite",
    inputCost: 0.075,
    outputCost: 0.3,
    tokenLimit: 1048576,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek: R1 (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "openai/gpt-4.1",
    name: "OpenAI: GPT-4.1",
    inputCost: 2,
    outputCost: 8,
    tokenLimit: 1047576,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta: Llama 3.3 70B Instruct",
    inputCost: 0.039,
    outputCost: 0.12,
    tokenLimit: 131072,
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "OpenAI: GPT-4.1 Mini",
    inputCost: 0.4,
    outputCost: 1.6,
    tokenLimit: 1047576,
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Meta: Llama 4 Maverick",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-2.5-pro-preview-05-06",
    name: "Google: Gemini 2.5 Pro Preview 05-06",
    inputCost: 1.25,
    outputCost: 10,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Google: Gemini 2.5 Pro Preview 06-05",
    inputCost: 1.25,
    outputCost: 10,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Google: Gemini 1.5 Flash",
    inputCost: 0.075,
    outputCost: 0.3,
    tokenLimit: 1000000,
  },
  {
    id: "google/gemini-flash-1.5-8b",
    name: "Google: Gemini 1.5 Flash 8B",
    inputCost: 0.038,
    outputCost: 0.15,
    tokenLimit: 1000000,
  },
  {
    id: "google/gemini-2.5-flash-preview-05-20:thinking",
    name: "Google: Gemini 2.5 Flash Preview 05-20 (thinking)",
    inputCost: 0.15,
    outputCost: 3.5,
    tokenLimit: 1048576,
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Meta: Llama 3.1 70B Instruct",
    inputCost: 0.1,
    outputCost: 0.28,
    tokenLimit: 131072,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek: DeepSeek V3",
    inputCost: 0.38,
    outputCost: 0.89,
    tokenLimit: 163840,
  },
  {
    id: "google/gemma-3-27b-it",
    name: "Google: Gemma 3 27B",
    inputCost: 0.1,
    outputCost: 0.18,
    tokenLimit: 64000,
  },
  {
    id: "x-ai/grok-3-mini-beta",
    name: "xAI: Grok 3 Mini Beta",
    inputCost: 0.3,
    outputCost: 0.5,
    tokenLimit: 131072,
  },
  {
    id: "deepseek/deepseek-r1-0528",
    name: "DeepSeek: R1 0528",
    inputCost: 0.5,
    outputCost: 2.15,
    tokenLimit: 128000,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Anthropic: Claude 3.5 Sonnet",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Meta: Llama 3.1 8B Instruct",
    inputCost: 0.016,
    outputCost: 0.021,
    tokenLimit: 131000,
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "OpenAI: GPT-4.1 Nano",
    inputCost: 0.1,
    outputCost: 0.4,
    tokenLimit: 1047576,
  },
  {
    id: "anthropic/claude-3.7-sonnet:thinking",
    name: "Anthropic: Claude 3.7 Sonnet (thinking)",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen2.5 72B Instruct",
    inputCost: 0.12,
    outputCost: 0.39,
    tokenLimit: 32768,
  },
  {
    id: "openai/gpt-4o-2024-11-20",
    name: "OpenAI: GPT-4o (2024-11-20)",
    inputCost: 2.5,
    outputCost: 10,
    tokenLimit: 128000,
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek: DeepSeek V3 (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct",
    name: "Meta: Llama 3.2 3B Instruct",
    inputCost: 0.003,
    outputCost: 0.006,
    tokenLimit: 20000,
  },
  {
    id: "microsoft/wizardlm-2-8x22b",
    name: "WizardLM-2 8x22B",
    inputCost: 0.48,
    outputCost: 0.48,
    tokenLimit: 65536,
  },
  {
    id: "qwen/qwen3-235b-a22b",
    name: "Qwen: Qwen3 235B A22B",
    inputCost: 0.13,
    outputCost: 0.6,
    tokenLimit: 40960,
  },
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    name: "Anthropic: Claude 3.5 Sonnet (self-moderated)",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Anthropic: Claude 3.5 Haiku",
    inputCost: 0.8,
    outputCost: 4,
    tokenLimit: 200000,
  },
  {
    id: "mistralai/mistral-small-24b-instruct-2501",
    name: "Mistral: Mistral Small 3",
    inputCost: 0.05,
    outputCost: 0.09,
    tokenLimit: 32768,
  },
  {
    id: "anthropic/claude-3.7-sonnet:beta",
    name: "Anthropic: Claude 3.7 Sonnet (self-moderated)",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 200000,
  },
  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    name: "Mistral: Mistral Small 3.2 24B",
    inputCost: 0.05,
    outputCost: 0.1,
    tokenLimit: 128000,
  },
  {
    id: "qwen/qwen-2.5-7b-instruct",
    name: "Qwen2.5 7B Instruct",
    inputCost: 0.04,
    outputCost: 0.1,
    tokenLimit: 32768,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek: R1",
    inputCost: 0.45,
    outputCost: 2.15,
    tokenLimit: 128000,
  },
  {
    id: "deepseek/deepseek-r1-distill-llama-70b",
    name: "DeepSeek: R1 Distill Llama 70B",
    inputCost: 0.1,
    outputCost: 0.4,
    tokenLimit: 131072,
  },
  {
    id: "google/gemini-2.5-flash-preview:thinking",
    name: "Google: Gemini 2.5 Flash Preview 04-17 (thinking)",
    inputCost: 0.15,
    outputCost: 3.5,
    tokenLimit: 1048576,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    name: "Qwen2.5 Coder 32B Instruct",
    inputCost: 0.06,
    outputCost: 0.15,
    tokenLimit: 32768,
  },
  {
    id: "qwen/qwen2.5-vl-72b-instruct",
    name: "Qwen: Qwen2.5 VL 72B Instruct",
    inputCost: 0.25,
    outputCost: 0.75,
    tokenLimit: 32000,
  },
  {
    id: "tngtech/deepseek-r1t-chimera:free",
    name: "TNG: DeepSeek R1T Chimera (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "openai/o4-mini",
    name: "OpenAI: o4 Mini",
    inputCost: 1.1,
    outputCost: 4.4,
    tokenLimit: 200000,
  },
  {
    id: "meta-llama/llama-4-scout",
    name: "Meta: Llama 4 Scout",
    inputCost: 0.08,
    outputCost: 0.3,
    tokenLimit: 1048576,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google: Gemini 2.0 Flash Experimental (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 1048576,
  },
  {
    id: "qwen/qwen3-32b",
    name: "Qwen: Qwen3 32B",
    inputCost: 0.1,
    outputCost: 0.3,
    tokenLimit: 40960,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral: Mistral Small 3.1 24B",
    inputCost: 0.05,
    outputCost: 0.1,
    tokenLimit: 128000,
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b",
    name: "Nous: Hermes 3 405B Instruct",
    inputCost: 0.7,
    outputCost: 0.8,
    tokenLimit: 131072,
  },
  {
    id: "openai/o3-mini",
    name: "OpenAI: o3 Mini",
    inputCost: 1.1,
    outputCost: 4.4,
    tokenLimit: 200000,
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-70b",
    name: "Nous: Hermes 3 70B Instruct",
    inputCost: 0.12,
    outputCost: 0.3,
    tokenLimit: 131072,
  },
  {
    id: "openai/gpt-4o-mini-2024-07-18",
    name: "OpenAI: GPT-4o-mini (2024-07-18)",
    inputCost: 0.15,
    outputCost: 0.6,
    tokenLimit: 128000,
  },
  {
    id: "gryphe/mythomax-l2-13b",
    name: "MythoMax 13B",
    inputCost: 0.065,
    outputCost: 0.065,
    tokenLimit: 4096,
  },
  {
    id: "google/gemma-3-4b-it",
    name: "Google: Gemma 3 4B",
    inputCost: 0.02,
    outputCost: 0.04,
    tokenLimit: 131072,
  },
  {
    id: "mistralai/mistral-tiny",
    name: "Mistral Tiny",
    inputCost: 0.25,
    outputCost: 0.25,
    tokenLimit: 32768,
  },
  {
    id: "qwen/qwen3-32b:free",
    name: "Qwen: Qwen3 32B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 40960,
  },
  {
    id: "qwen/qwen3-14b",
    name: "Qwen: Qwen3 14B",
    inputCost: 0.06,
    outputCost: 0.24,
    tokenLimit: 40960,
  },
  {
    id: "minimax/minimax-01",
    name: "MiniMax: MiniMax-01",
    inputCost: 0.2,
    outputCost: 1.1,
    tokenLimit: 1000192,
  },
  {
    id: "mistralai/mixtral-8x7b-instruct",
    name: "Mistral: Mixtral 8x7B Instruct",
    inputCost: 0.08,
    outputCost: 0.24,
    tokenLimit: 32768,
  },
  {
    id: "thedrummer/unslopnemo-12b",
    name: "TheDrummer: UnslopNemo 12B",
    inputCost: 0.4,
    outputCost: 0.4,
    tokenLimit: 32768,
  },
  {
    id: "qwen/qwq-32b",
    name: "Qwen: QwQ 32B",
    inputCost: 0.075,
    outputCost: 0.15,
    tokenLimit: 131072,
  },
  {
    id: "sao10k/l3-lunaris-8b",
    name: "Sao10K: Llama 3 8B Lunaris",
    inputCost: 0.02,
    outputCost: 0.05,
    tokenLimit: 8192,
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral: Mistral Nemo (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 131072,
  },
  {
    id: "openai/chatgpt-4o-latest",
    name: "OpenAI: ChatGPT-4o",
    inputCost: 5,
    outputCost: 15,
    tokenLimit: 128000,
  },
  {
    id: "qwen/qwen3-30b-a3b",
    name: "Qwen: Qwen3 30B A3B",
    inputCost: 0.08,
    outputCost: 0.29,
    tokenLimit: 40960,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Anthropic: Claude 3 Haiku",
    inputCost: 0.25,
    outputCost: 1.25,
    tokenLimit: 200000,
  },
  {
    id: "thedrummer/rocinante-12b",
    name: "TheDrummer: Rocinante 12B",
    inputCost: 0.2,
    outputCost: 0.5,
    tokenLimit: 32768,
  },
  {
    id: "x-ai/grok-3-mini",
    name: "xAI: Grok 3 Mini",
    inputCost: 0.3,
    outputCost: 0.5,
    tokenLimit: 131072,
  },
  {
    id: "qwen/qwen3-14b:free",
    name: "Qwen: Qwen3 14B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 40960,
  },
  {
    id: "nousresearch/hermes-2-pro-llama-3-8b",
    name: "NousResearch: Hermes 2 Pro - Llama-3 8B",
    inputCost: 0.025,
    outputCost: 0.04,
    tokenLimit: 131072,
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen: Qwen3 235B A22B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 40960,
  },
  {
    id: "liquid/lfm-7b",
    name: "Liquid: LFM 7B",
    inputCost: 0.01,
    outputCost: 0.01,
    tokenLimit: 32768,
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Google: Gemma 3 27B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 96000,
  },
  {
    id: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    name: "DeepSeek: Deepseek R1 0528 Qwen3 8B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 131072,
  },
  {
    id: "liquid/lfm-3b",
    name: "Liquid: LFM 3B",
    inputCost: 0.02,
    outputCost: 0.02,
    tokenLimit: 32768,
  },
  {
    id: "minimax/minimax-m1",
    name: "MiniMax: MiniMax M1",
    inputCost: 0.3,
    outputCost: 1.65,
    tokenLimit: 1000000,
  },
  {
    id: "qwen/qwen-turbo",
    name: "Qwen: Qwen-Turbo",
    inputCost: 0.05,
    outputCost: 0.2,
    tokenLimit: 1000000,
  },
  {
    id: "x-ai/grok-2-1212",
    name: "xAI: Grok 2 1212",
    inputCost: 2,
    outputCost: 10,
    tokenLimit: 131072,
  },
  {
    id: "neversleep/llama-3.1-lumimaid-8b",
    name: "NeverSleep: Lumimaid v0.2 8B",
    inputCost: 0.2,
    outputCost: 1.25,
    tokenLimit: 32768,
  },
  {
    id: "qwen/qwq-32b:free",
    name: "Qwen: QwQ 32B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 131072,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Google: Gemini 1.5 Pro",
    inputCost: 1.25,
    outputCost: 5,
    tokenLimit: 2000000,
  },
  {
    id: "sao10k/l3.1-euryale-70b",
    name: "Sao10K: Llama 3.1 Euryale 70B v2.2",
    inputCost: 0.65,
    outputCost: 0.75,
    tokenLimit: 32768,
  },
  {
    id: "anthropic/claude-3.5-haiku-20241022",
    name: "Anthropic: Claude 3.5 Haiku (2024-10-22)",
    inputCost: 0.8,
    outputCost: 4,
    tokenLimit: 200000,
  },
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Meta: Llama 4 Maverick (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 128000,
  },
  {
    id: "google/gemma-3-12b-it",
    name: "Google: Gemma 3 12B",
    inputCost: 0.05,
    outputCost: 0.1,
    tokenLimit: 131072,
  },
  {
    id: "mistralai/ministral-8b",
    name: "Mistral: Ministral 8B",
    inputCost: 0.1,
    outputCost: 0.1,
    tokenLimit: 128000,
  },
  {
    id: "mistralai/devstral-small",
    name: "Mistral: Devstral Small",
    inputCost: 0.06,
    outputCost: 0.12,
    tokenLimit: 128000,
  },
  {
    id: "microsoft/mai-ds-r1:free",
    name: "Microsoft: MAI DS R1 (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 163840,
  },
  {
    id: "openai/o4-mini-high",
    name: "OpenAI: o4 Mini High",
    inputCost: 1.1,
    outputCost: 4.4,
    tokenLimit: 200000,
  },
  {
    id: "microsoft/phi-4",
    name: "Microsoft: Phi 4",
    inputCost: 0.07,
    outputCost: 0.14,
    tokenLimit: 16384,
  },
  {
    id: "meta-llama/llama-3-8b-instruct",
    name: "Meta: Llama 3 8B Instruct",
    inputCost: 0.03,
    outputCost: 0.06,
    tokenLimit: 8192,
  },
  {
    id: "qwen/qwen2.5-vl-72b-instruct:free",
    name: "Qwen: Qwen2.5 VL 72B Instruct (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 131072,
  },
  {
    id: "mistralai/codestral-2501",
    name: "Mistral: Codestral 2501",
    inputCost: 0.3,
    outputCost: 0.9,
    tokenLimit: 262144,
  },
  {
    id: "x-ai/grok-3",
    name: "xAI: Grok 3",
    inputCost: 3,
    outputCost: 15,
    tokenLimit: 131072,
  },
  {
    id: "mistralai/pixtral-12b",
    name: "Mistral: Pixtral 12B",
    inputCost: 0.1,
    outputCost: 0.1,
    tokenLimit: 32768,
  },
  {
    id: "mistralai/mistral-7b-instruct",
    name: "Mistral: Mistral 7B Instruct",
    inputCost: 0.028,
    outputCost: 0.054,
    tokenLimit: 32768,
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral: Mistral Small 3.1 24B (free)",
    inputCost: 0,
    outputCost: 0,
    tokenLimit: 96000,
  },
];

export const AVAILABLE_MODELS = ALL_MODELS.slice(0, 10);

export class AIPlayer {
  private model: string;
  private apiKey: string;
  private withReasoning: boolean;

  constructor(model: string, withReasoning = true, apiKey?: string) {
    this.model = model;
    this.apiKey = apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    this.withReasoning = withReasoning;
  }

  async generateSpymasterClue(
    gameState: GameState,
    playerId: string,
  ): Promise<{ word: string; count: number }> {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player || player.role !== "spymaster") {
      throw new Error("Invalid spymaster player");
    }

    const myTeam = player.team;
    const myCards = gameState.cards.filter(
      (card) => !card.revealed && card.type === myTeam,
    );
    const enemyCards = gameState.cards.filter(
      (card) =>
        !card.revealed && card.type !== myTeam && card.type !== "neutral",
    );
    const neutralCards = gameState.cards.filter(
      (card) => !card.revealed && card.type === "neutral",
    );
    const assassinCard = gameState.cards.find(
      (card) => !card.revealed && card.type === "assassin",
    );

    let retries = 4;
    let lastError: Error | null = null;
    const previousClues: string[] = [];

    while (retries > 0) {
      try {
        const prompt = `You are playing Codenames as the ${myTeam} team spymaster. Your goal is to give a one-word clue that helps your operatives identify your team's cards while avoiding enemy cards, neutral cards, and especially the assassin.

    GAME STATE:
    - Current turn: ${gameState.currentTeam} team (${gameState.currentTeam === myTeam ? "YOUR TURN" : "not your turn"})
    - Your team (${myTeam}) has ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} agents remaining
    - Enemy team has ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} agents remaining
    
    YOUR CARDS (that you want operatives to guess):
    ${myCards.map((card) => `- ${card.word}`).join("\n")}
    
    ENEMY CARDS (avoid these):
    ${enemyCards.map((card) => `- ${card.word}`).join("\n")}
    
    NEUTRAL CARDS (avoid these):
    ${neutralCards.map((card) => `- ${card.word}`).join("\n")}
    
    ASSASSIN CARD (NEVER hint at this - instant loss):
    ${assassinCard ? `- ${assassinCard.word}` : "- (already revealed)"}
    
    RULES:
    1. Give exactly ONE word as your clue
    2. Give a number indicating how many of your cards relate to this clue
    3. The clue cannot be any word currently visible on the board
    4. The clue must relate to the MEANING of words, not spelling or position
    5. Avoid clues that might accidentally point to enemy cards, neutral cards, or the assassin
    
    STRATEGY:
    - Try to find connections between 2-3 of your cards
    - Be very careful not to accidentally reference enemy cards or the assassin
    - Consider what your operatives might think when they hear your clue
    
    Respond with ONLY a JSON object in this format:
    {
      ${this.withReasoning ? `"reasoning": "brief explanation of your choice",` : ""}
      "word": "your_clue_word",
      "count": number_of_related_cards
    }

    ${lastError ? `Your previous clue: ${previousClues.at(-1)} were invalid. Last error: ${lastError.message}` : ""}
    `;

        const { object } = await generateObject({
          model: openrouter(this.model),
          prompt,
          temperature: 0.7,
          schema: z.object({
            ...(this.withReasoning ? { reasoning: z.string() } : {}),
            word: z.string(),
            count: z.number(),
          }),
        });

        const { word, count } = object;

        previousClues.push(word.toLowerCase().trim());

        console.log(
          `${this.model} generated clue: ${word} - ${count} - ${this.withReasoning ? (object.reasoning as string) : ""}`,
        );

        // validate response
        // check if only one word
        if (word.split(" ").length > 1) {
          throw new Error("Clue must be a single word");
        }
        // check that word is not a subset of any word in the game state, or that any word in the game state is a subset of the clue
        if (gameState.cards.some((card) => card.word.includes(word))) {
          throw new Error(
            "Clue cannot be a subset of any word in the game state",
          );
        }
        if (gameState.cards.some((card) => word.includes(card.word))) {
          throw new Error(
            "Clue cannot be a superset of any word in the game state",
          );
        }

        return {
          word: word.toLowerCase().trim(),
          count,
        };
      } catch (error) {
        lastError = error as Error;
        retries--;

        if (retries === 0) {
          throw new Error(
            `Failed to generate spymaster clue after attempts. error: ${lastError}`,
          );
        }

        console.log(
          `AI clue generation failed, retrying... (${retries} attempts left). Error: ${lastError.message}`,
        );
      }
    }

    return { word: "Error: Failed to generate clue", count: 0 };
  }

  async generateOperativeGuess(
    gameState: GameState,
    playerId: string,
  ): Promise<{ cardIndex: number; shouldPass: boolean }> {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player || player.role !== "operative") {
      throw new Error("Invalid operative player");
    }

    const myTeam = player.team;
    const unrevealedCards = gameState.cards.filter((card) => !card.revealed);
    const currentClue = gameState.currentClue;

    if (!currentClue || !unrevealedCards.length) {
      return { cardIndex: -1, shouldPass: true };
    }

    const prompt = `You are playing Codenames as a ${myTeam} team operative. Your spymaster just gave you a clue, and you need to decide which card to guess or whether to pass your turn.

CURRENT CLUE: "${currentClue.word}" - ${currentClue.count}
This means your spymaster thinks ${currentClue.count} cards on the board relate to "${currentClue.word}".

REMAINING GUESSES: ${gameState.remainingGuesses}

UNREVEALED CARDS:
${unrevealedCards.map((card, index) => `${index}: ${card.word}`).join("\n")}

GAME CONTEXT:
- Your team (${myTeam}) needs ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} more agents
- Enemy team needs ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} more agents
- There is 1 assassin card that will end the game if guessed (you lose)

PREVIOUS GAME HISTORY:
${gameState.gameHistory
  .slice(-3)
  .map((action) => {
    if (action.type === "clue") {
      const clue = action.data;
      return `- ${action.team} spymaster gave clue: "${clue.word}" - ${clue.count}`;
    } else if (action.type === "guess") {
      const guess = action.data;
      const card = gameState.cards[guess.cardIndex];
      return `- ${action.team} operative guessed: "${card?.word}" (was ${card?.type})`;
    }
    return `- ${action.team} ${action.type}`;
  })
  .join("\n")}

INSTRUCTIONS:
1. Think about which cards might relate to the clue "${currentClue.word}"
2. Consider the number ${currentClue.count} - this is how many cards your spymaster thinks relate
3. Be cautious - wrong guesses help the enemy or might hit the assassin
4. If you're unsure or have used up logical guesses, you should pass

Respond with ONLY a JSON object in this format:
{
  ${this.withReasoning ? `"reasoning": "brief explanation of your choice",` : ""}
  "cardIndex": number_from_list_above_or_-1_if_passing,
  "shouldPass": boolean
}`;

    try {
      const { object } = await generateObject({
        model: openrouter(this.model),
        prompt,
        temperature: 0.8,
        schema: z.object({
          ...(this.withReasoning ? { reasoning: z.string() } : {}),
          cardIndex: z.number(),
          shouldPass: z.boolean(),
        }),
      });

      const { cardIndex, shouldPass } = object;

      console.log(
        `${this.model} generated guess: ${cardIndex} - ${this.withReasoning ? (object.reasoning as string) : ""}`,
      );

      // Validate response
      if (shouldPass) {
        return { cardIndex: -1, shouldPass: true };
      }

      if (
        typeof cardIndex !== "number" ||
        cardIndex < 0 ||
        cardIndex >= unrevealedCards.length
      ) {
        return { cardIndex: -1, shouldPass: true };
      }

      // Map back to original card index
      const originalCardIndex = gameState.cards.findIndex(
        (card) =>
          card.word === unrevealedCards[cardIndex]?.word && !card.revealed,
      );

      return {
        cardIndex: originalCardIndex,
        shouldPass: false,
      };
    } catch (error) {
      console.error("AI Operative error:", error);
      // Fallback to passing
      return { cardIndex: -1, shouldPass: true };
    }
  }
}
