"use client";

import { useState } from "react";
import { Bot, GraduationCap, Package, ShoppingCart, Sparkles } from "lucide-react";
import { AIChatPanel } from "../components/AIChatWidget";
import { appProduct } from "../lib/product-config";

const MALILINK_EXAMPLES = [
  "Résume mes ventes aujourd’hui",
  "Quels produits se vendent le plus ?",
  "Aide-moi à suivre mes livraisons",
  "Explique-moi comment utiliser MaliLink",
  "Quelles commandes sont en attente ?",
  "Aide-moi à gérer mon école",
  "Aide-moi à comprendre ma mission de livraison",
];

function MaliLinkAssistantPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-[#0a1c3a] p-6 text-white shadow md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
              <Bot size={28} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">Assistant IA MaliLink</h1>
              <p className="text-sm text-yellow-400">Réponses en français, adaptées à votre espace et à votre rôle</p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-white/80">
            Posez vos questions sur vos ventes, vos commandes marketplace, vos livraisons, votre
            école ou le fonctionnement de MaliLink. L’assistant n’accède qu’aux données autorisées
            pour votre compte.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm">
              <ShoppingCart size={18} className="shrink-0 text-yellow-400" />
              Ventes, commandes et marketplace
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm">
              <Package size={18} className="shrink-0 text-yellow-400" />
              Livraisons et missions livreur
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm">
              <GraduationCap size={18} className="shrink-0 text-yellow-400" />
              École : élèves, notes, présences
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
          <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
            <Sparkles size={18} className="text-yellow-600" />
            <h2 className="text-lg font-black text-black">Discussion</h2>
          </div>
          <AIChatPanel
            space="business_dashboard"
            suggestions={MALILINK_EXAMPLES}
            heightClass="h-[min(600px,calc(100dvh-220px))]"
          />
        </div>
      </div>
    </div>
  );
}

function TriangleAssistantPage() {
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Bonjour, je suis l’assistant IA de Triangle WMS Pro. Je connais les modules du WMS, POS, pointage, rapports, documents et comptabilité. Je peux expliquer leur rôle ou consulter les données autorisées.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const savedUser = localStorage.getItem("user");
    const user = savedUser ? JSON.parse(savedUser) : null;

    const userMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          message: input,
          user,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.answer ||
            data.error ||
            "Erreur IA.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur de connexion avec l’assistant IA.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-black mb-2">
        Assistant IA
      </h1>

      <p className="text-gray-500 mb-8">
        Assistant intelligent connecté aux modules, aux règles métier et aux
        données autorisées de Triangle WMS Pro.
      </p>

      <div className="bg-white rounded-2xl shadow p-6 h-[650px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-4 whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-yellow-500 text-black"
                    : "bg-gray-100 text-black"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-gray-500 font-bold">
              L’assistant réfléchit...
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Pose ta question à l’assistant IA..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            className="flex-1 border p-4 rounded-xl text-black"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-black text-white font-bold px-8 rounded-xl"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  if (appProduct === "malilink") {
    return <MaliLinkAssistantPage />;
  }
  return <TriangleAssistantPage />;
}
