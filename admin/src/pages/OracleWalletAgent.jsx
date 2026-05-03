import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaKey,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTrash,
  FaGift,
  FaPercent,
  FaMoneyBillWave,
  FaSyncAlt,
} from "react-icons/fa";

const emptyBonus = () => ({
  title: {
    bn: "",
    en: "",
  },
  bonusType: "fixed",
  bonusValue: 0,
  turnoverMultiplier: 0,
  isActive: true,
});

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const OracleWalletAgent = () => {
  const API = import.meta.env.VITE_REACT_APP_BACKEND_API2;

  const [businessToken, setBusinessToken] = useState("");
  const [active, setActive] = useState(false);
  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(0);
  const [bonuses, setBonuses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const maskedToken = useMemo(() => {
    return businessToken
      ? "•".repeat(Math.min(businessToken.length, 24))
      : "No token set";
  }, [businessToken]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/api/oraclepay-business/admin`);

      if (res.data?.success) {
        const data = res.data?.data || {};

        setBusinessToken(data.businessToken || "");
        setActive(!!data.active);
        setMinAmount(num(data.minAmount) || 5);
        setMaxAmount(num(data.maxAmount) || 0);
        setBonuses(Array.isArray(data.bonuses) ? data.bonuses : []);
      } else {
        toast.error(res.data?.message || "Failed to load OraclePay settings");
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to load OraclePay settings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API]);

  const updateBonus = (index, path, value) => {
    setBonuses((prev) =>
      prev.map((bonus, i) => {
        if (i !== index) return bonus;

        if (path === "title.bn") {
          return {
            ...bonus,
            title: { ...(bonus.title || {}), bn: value },
          };
        }

        if (path === "title.en") {
          return {
            ...bonus,
            title: { ...(bonus.title || {}), en: value },
          };
        }

        return {
          ...bonus,
          [path]: value,
        };
      }),
    );
  };

  const addBonus = () => {
    setBonuses((prev) => [...prev, emptyBonus()]);
  };

  const removeBonus = (index) => {
    setBonuses((prev) => prev.filter((_, i) => i !== index));
  };

  const validateBeforeSave = () => {
    const min = num(minAmount);
    const max = num(maxAmount);

    if (min < 0) {
      toast.error("Minimum amount cannot be negative");
      return false;
    }

    if (max < 0) {
      toast.error("Maximum amount cannot be negative");
      return false;
    }

    if (max > 0 && min > max) {
      toast.error("Minimum amount cannot be greater than maximum amount");
      return false;
    }

    for (let i = 0; i < bonuses.length; i += 1) {
      const b = bonuses[i];

      if (!String(b?.title?.bn || "").trim()) {
        toast.error(`Bonus #${i + 1}: Bangla title required`);
        return false;
      }

      if (!String(b?.title?.en || "").trim()) {
        toast.error(`Bonus #${i + 1}: English title required`);
        return false;
      }

      if (!["fixed", "percent"].includes(b?.bonusType)) {
        toast.error(`Bonus #${i + 1}: Invalid bonus type`);
        return false;
      }

      if (num(b?.bonusValue) < 0) {
        toast.error(`Bonus #${i + 1}: Bonus value cannot be negative`);
        return false;
      }

      if (num(b?.turnoverMultiplier) < 0) {
        toast.error(`Bonus #${i + 1}: Turnover multiplier cannot be negative`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    try {
      setLoading(true);

      const payload = {
        businessToken,
        active,
        minAmount: num(minAmount),
        maxAmount: num(maxAmount),
        bonuses: bonuses.map((b) => ({
          _id: b?._id,
          title: {
            bn: String(b?.title?.bn || "").trim(),
            en: String(b?.title?.en || "").trim(),
          },
          bonusType: b?.bonusType === "percent" ? "percent" : "fixed",
          bonusValue: Math.max(0, num(b?.bonusValue)),
          turnoverMultiplier: Math.max(0, num(b?.turnoverMultiplier)),
          isActive: !!b?.isActive,
        })),
      };

      const res = await axios.put(
        `${API}/api/oraclepay-business/admin`,
        payload,
      );

      if (res.data?.success) {
        toast.success("OraclePay settings saved!");

        if (Array.isArray(res.data?.data?.bonuses)) {
          setBonuses(res.data.data.bonuses);
        }
      } else {
        toast.error(res.data?.message || "Failed to save");
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to save OraclePay settings",
      );
    } finally {
      setLoading(false);
    }
  };

  const ready = active && businessToken.trim();

  return (
    <div className="p-5 md:p-8 min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-black text-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-b from-emerald-950/70 to-black/70 rounded-2xl border border-emerald-800/50 shadow-2xl shadow-emerald-950/40 backdrop-blur-sm p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-7">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-emerald-100 tracking-tight">
                Oracle Wallet Agent
              </h2>
              <p className="text-sm text-emerald-300/80 mt-2">
                Set <b>X-Opay-Business-Token</b>, deposit limits, bonus and
                turnover settings.
              </p>
            </div>

            <div className="flex items-center gap-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg px-4 py-2.5 text-sm">
              <FaShieldAlt className="text-emerald-400" />
              <span className="text-emerald-200/90 font-medium">
                Token stays server-side only
              </span>
            </div>
          </div>

          <div className="space-y-7">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-emerald-200 flex items-center gap-2.5">
                <FaKey className="text-emerald-400 text-lg" />
                X-Opay-Business-Token
              </label>

              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={showToken ? businessToken : maskedToken}
                  onChange={(e) => setBusinessToken(e.target.value)}
                  onFocus={() => {
                    if (!showToken) setShowToken(true);
                  }}
                  placeholder="YOUR_BUSINESS_API_TOKEN"
                  className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3.5 pr-12 text-emerald-100 placeholder-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />

                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300 transition-colors p-1.5 rounded-md hover:bg-emerald-950/50 cursor-pointer"
                >
                  {showToken ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>

              <div className="text-xs text-emerald-400/70 leading-relaxed mt-1.5">
                <span className="text-green-400">✔</span> This token{" "}
                <b>never</b> goes to the client.
                <br />
                <span className="text-green-400">✔</span> Backend uses it to
                call OraclePay APIs.
                <br />
                <span className="text-amber-400">⚠</span> No token = feature
                won't work even if Active is ON.
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-200">
                  Minimum Deposit Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-200">
                  Maximum Deposit Amount
                  <span className="text-emerald-400/60 font-normal">
                    {" "}
                    (0 = Unlimited)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-5">
              <div>
                <p className="font-semibold text-emerald-100 text-lg">
                  OraclePay Active
                </p>
                <p className="text-sm text-emerald-300/80 mt-1">
                  When enabled, clients will see Opay/OraclePay deposit option.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all shadow-md cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {active ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />}
                {active ? "Active" : "Inactive"}
              </button>
            </div>

            <div
              className={`rounded-xl border px-5 py-4 text-sm font-medium ${
                ready
                  ? "bg-emerald-900/40 border-emerald-600/50 text-emerald-200"
                  : "bg-amber-950/40 border-amber-800/50 text-amber-200"
              }`}
            >
              {ready ? (
                <span className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">●</span>
                  <b>Ready:</b> Token is set + Active → OraclePay enabled on
                  client
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-amber-400 text-lg">⚠</span>
                  <b>Not Ready:</b>{" "}
                  {active
                    ? "Active is ON but token is empty"
                    : "Feature is Inactive"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-emerald-950/70 to-black/70 rounded-2xl border border-emerald-800/50 shadow-2xl shadow-emerald-950/30 backdrop-blur-sm p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-emerald-100 flex items-center gap-2">
                <FaGift className="text-emerald-400" />
                Deposit Bonus & Turnover
              </h3>
              <p className="text-sm text-emerald-300/75 mt-1">
                Multiple bonus add korte parbe. User bonus select korle oi bonus
                er sathe alada turnover create hobe.
              </p>
            </div>

            <button
              type="button"
              onClick={addBonus}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <FaPlus />
              Add Bonus
            </button>
          </div>

          {bonuses.length === 0 ? (
            <div className="border border-dashed border-emerald-700/70 rounded-2xl p-8 text-center bg-black/25">
              <FaGift className="text-4xl text-emerald-500 mx-auto mb-3" />
              <p className="text-emerald-100 font-semibold">
                No bonus added yet
              </p>
              <p className="text-sm text-emerald-400/70 mt-1">
                Click “Add Bonus” to create fixed or percentage deposit bonus.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {bonuses.map((bonus, index) => {
                const bonusType = bonus?.bonusType || "fixed";
                const bonusValue = num(bonus?.bonusValue);
                const multiplier = num(bonus?.turnoverMultiplier);

                return (
                  <div
                    key={bonus?._id || index}
                    className="rounded-2xl border border-emerald-800/50 bg-black/30 p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                      <div>
                        <p className="text-emerald-100 font-bold">
                          Bonus #{index + 1}
                        </p>
                        <p className="text-xs text-emerald-400/70 mt-1">
                          {bonusType === "percent"
                            ? `${bonusValue}% bonus`
                            : `৳ ${bonusValue} fixed bonus`}{" "}
                          • Turnover {multiplier}x
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateBonus(index, "isActive", !bonus?.isActive)
                          }
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                            bonus?.isActive
                              ? "bg-emerald-600/90 text-white"
                              : "bg-gray-800 text-gray-300"
                          }`}
                        >
                          {bonus?.isActive ? <FaToggleOn /> : <FaToggleOff />}
                          {bonus?.isActive ? "Active" : "Inactive"}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeBonus(index)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/70 hover:bg-red-800 text-red-100 border border-red-700/50 text-sm font-semibold cursor-pointer"
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-emerald-200">
                          Bonus Title Bangla
                        </label>
                        <input
                          type="text"
                          value={bonus?.title?.bn || ""}
                          onChange={(e) =>
                            updateBonus(index, "title.bn", e.target.value)
                          }
                          className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 placeholder-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="যেমন: ১০% ডিপোজিট বোনাস"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-emerald-200">
                          Bonus Title English
                        </label>
                        <input
                          type="text"
                          value={bonus?.title?.en || ""}
                          onChange={(e) =>
                            updateBonus(index, "title.en", e.target.value)
                          }
                          className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 placeholder-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="Example: 10% Deposit Bonus"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-emerald-200">
                          Bonus Type
                        </label>
                        <div className="relative">
                          <select
                            value={bonusType}
                            onChange={(e) =>
                              updateBonus(index, "bonusType", e.target.value)
                            }
                            className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          >
                            <option value="fixed">Fixed Amount</option>
                            <option value="percent">Percentage</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                          {bonusType === "percent" ? (
                            <FaPercent className="text-emerald-400" />
                          ) : (
                            <FaMoneyBillWave className="text-emerald-400" />
                          )}
                          Bonus Value
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={bonus?.bonusValue ?? 0}
                          onChange={(e) =>
                            updateBonus(index, "bonusValue", e.target.value)
                          }
                          className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 placeholder-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          placeholder={bonusType === "percent" ? "10" : "100"}
                        />
                        <p className="text-xs text-emerald-400/60">
                          {bonusType === "percent"
                            ? "Example: 10 means 10% of deposit amount"
                            : "Example: 100 means fixed ৳100 bonus"}
                        </p>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                          <FaSyncAlt className="text-emerald-400" />
                          Turnover Multiplier
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={bonus?.turnoverMultiplier ?? 0}
                          onChange={(e) =>
                            updateBonus(
                              index,
                              "turnoverMultiplier",
                              e.target.value,
                            )
                          }
                          className="w-full bg-black/40 border border-emerald-800/70 rounded-lg px-4 py-3 text-emerald-100 placeholder-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="5"
                        />
                        <p className="text-xs text-emerald-400/60">
                          Example: deposit ৳1000 + bonus ৳100 = credited ৳1100.
                          Turnover 5x hole required turnover = ৳5500.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-emerald-950/70 to-black/70 rounded-2xl border border-emerald-800/50 shadow-xl shadow-emerald-950/30 backdrop-blur-sm p-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-red-900/40 border border-red-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            type="button"
          >
            <FaSave />
            {loading ? "Saving..." : "Save Settings"}
          </button>

          <div className="text-xs text-emerald-400/60 italic mt-4">
            Tip: In production, make sure <b>PUBLIC_BACKEND_URL</b> uses{" "}
            <b>https</b> so webhooks work correctly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OracleWalletAgent;
