import { useEffect, useMemo, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/Context/AuthContext";
import {
  FaBolt,
  FaCheckCircle,
  FaGift,
  FaMoneyBillWave,
  FaSpinner,
  FaUser,
  FaWallet,
} from "react-icons/fa";

const AutoDeposit = () => {
  const { userId, user, language } = useContext(AuthContext);

  const [oraclePayEnabled, setOraclePayEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [minAmount, setMinAmount] = useState(5);
  const [maxAmount, setMaxAmount] = useState(0);
  const [bonuses, setBonuses] = useState([]);
  const [selectedBonusId, setSelectedBonusId] = useState("");

  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("100");
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isBn = language === "bn";

  const amounts = useMemo(
    () => [100, 200, 500, 1000, 3000, 5000, 10000, 25000],
    [],
  );

  const clampNumber = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.floor(n);
  };

  const money = (value) => {
    const n = Number(value || 0);
    return `৳${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getBonusTitle = (bonus) => {
    if (!bonus) return isBn ? "কোনো বোনাস নেই" : "No Bonus";
    return isBn
      ? bonus?.title?.bn || bonus?.title?.en || "Bonus"
      : bonus?.title?.en || bonus?.title?.bn || "Bonus";
  };

  useEffect(() => {
    const fetchOraclePayStatus = async () => {
      try {
        setLoadingStatus(true);

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/oraclepay-business/status`,
        );

        const data = res?.data?.data || {};

        setOraclePayEnabled(!!data.enabled);
        setMinAmount(clampNumber(data.minAmount || 5));
        setMaxAmount(clampNumber(data.maxAmount || 0));
        setBonuses(Array.isArray(data.bonuses) ? data.bonuses : []);
      } catch {
        setOraclePayEnabled(false);
        setBonuses([]);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchOraclePayStatus();
  }, []);

  const amountNumber = clampNumber(customAmount || selectedAmount);

  const selectedBonus = useMemo(() => {
    if (!selectedBonusId) return null;
    return (
      bonuses.find((b) => String(b._id) === String(selectedBonusId)) || null
    );
  }, [bonuses, selectedBonusId]);

  const bonusSummary = useMemo(() => {
    const amount = amountNumber;

    if (!selectedBonus || !amount) {
      return {
        bonusAmount: 0,
        totalCredited: amount,
        turnoverMultiplier: 0,
        requiredTurnover: 0,
      };
    }

    const bonusType =
      selectedBonus?.bonusType === "percent" ? "percent" : "fixed";

    const bonusValue = Number(selectedBonus?.bonusValue || 0);
    const turnoverMultiplier = Number(selectedBonus?.turnoverMultiplier || 0);

    const bonusAmount =
      bonusType === "percent" ? (amount * bonusValue) / 100 : bonusValue;

    const totalCredited = amount + bonusAmount;
    const requiredTurnover = totalCredited * turnoverMultiplier;

    return {
      bonusAmount,
      totalCredited,
      turnoverMultiplier,
      requiredTurnover,
    };
  }, [amountNumber, selectedBonus]);

  const handleAmountChange = (a) => {
    setSelectedAmount(a);
    setCustomAmount(String(a));
  };

  const handleCustomAmountChange = (e) => {
    const v = e.target.value.replace(/[^\d]/g, "");
    setCustomAmount(v);
    setSelectedAmount(clampNumber(v) || 0);
  };

  const validateDeposit = () => {
    if (!oraclePayEnabled) {
      toast.error(
        isBn ? "Auto Deposit এখন Available নেই" : "Auto Deposit is disabled",
      );
      return false;
    }

    if (!amountNumber || amountNumber < minAmount) {
      toast.error(
        isBn ? `Minimum amount ${minAmount}` : `Minimum amount is ${minAmount}`,
      );
      return false;
    }

    if (maxAmount > 0 && amountNumber > maxAmount) {
      toast.error(
        isBn ? `Maximum amount ${maxAmount}` : `Maximum amount is ${maxAmount}`,
      );
      return false;
    }

    if (!userId) {
      toast.error(
        isBn ? "Please login again" : "User not found. Please login again.",
      );
      return false;
    }

    return true;
  };

  const openConfirmModal = () => {
    if (!validateDeposit()) return;
    setShowConfirm(true);
  };

  const handleConfirmDeposit = async () => {
    try {
      setProcessing(true);

      const invoiceNumber = `DEP-${userId}-${Date.now()}`;

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/oraclepay-business/create`,
        {
          amount: amountNumber,
          userIdentity: userId,
          invoiceNumber,
          bonusId: selectedBonusId || "",
          checkoutItems: {
            type: "deposit",
            method: "auto",
            gateway: "oraclepay",
            username: user?.username || "",
            selected_bonus_id: selectedBonusId || "",
            selected_bonus_title_bn: selectedBonus?.title?.bn || "",
            selected_bonus_title_en: selectedBonus?.title?.en || "",
          },
        },
      );

      if (res.data?.success && res.data?.payment_page_url) {
        window.location.href = res.data.payment_page_url;
        return;
      }

      toast.error(res.data?.message || "Payment link create failed");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Payment link create failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-dvh px-3 py-4">
        <div className="mx-auto flex max-w-sm items-center justify-center gap-2 rounded-lg border border-[#00ffaa]/30 bg-gradient-to-br from-[#003840] via-[#00252b] to-black p-4 text-white shadow-lg">
          <FaSpinner className="animate-spin text-lg text-[#00ffaa]" />
          <span className="text-sm font-extrabold">
            Loading Auto Deposit...
          </span>
        </div>
      </div>
    );
  }

  if (!oraclePayEnabled) {
    return (
      <div className="min-h-dvh px-3 py-4">
        <div className="mx-auto max-w-sm rounded-xl border border-red-400/30 bg-gradient-to-br from-black via-red-950/30 to-[#001f24] p-5 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/15 text-xl text-red-300">
            <FaBolt />
          </div>

          <h2 className="mt-3 text-lg font-black text-white">Auto Deposit</h2>

          <p className="mt-2 text-xs font-medium text-red-100/80">
            {isBn
              ? "এই মুহূর্তে Auto Deposit বন্ধ আছে। পরে চেষ্টা করুন।"
              : "Auto Deposit is currently disabled. Please try later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-auto px-2 py-3 pb-24 text-white sm:px-3 md:px-4 md:py-4">
      <div className="mx-auto max-w-5xl overflow-y-auto">
        <div className="overflow-visible rounded-xl border border-[#00ffaa]/25 bg-gradient-to-br from-[#001f24] via-[#003840] to-black shadow-xl shadow-[#00ffaa]/10 md:max-h-[calc(70dvh-40px)] md:overflow-y-auto md:[scrollbar-width:none]">
          <div className="border-b border-[#00ffaa]/25 bg-gradient-to-r from-[#0f727c] via-[#004e56] to-[#001f24] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00ffaa]/15 text-lg text-[#00ffaa] shadow">
                  <FaWallet />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-black text-[#ffe600] md:text-xl">
                    Auto Deposit
                  </h2>
                  <p className="truncate text-xs font-medium text-cyan-100/85">
                    {isBn
                      ? "পরিমাণ সিলেক্ট করুন অথবা টাইপ করুন"
                      : "Select or type amount"}
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-lg border border-[#00ffaa]/25 bg-black/25 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] text-cyan-100/80">
                  <FaUser />
                  User
                </div>
                <div className="max-w-[90px] truncate text-xs font-black text-white">
                  {user?.username || "User"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-2.5">
            <div className="rounded-xl border border-[#00ffaa]/20 bg-black/35 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-[#10f3c8]">
                    {isBn ? "ডিপোজিট পরিমাণ" : "Deposit Amount"}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-cyan-100/60">
                    Min {money(minAmount)}
                    {maxAmount > 0 ? ` • Max ${money(maxAmount)}` : ""}
                  </p>
                </div>

                <div className="rounded-lg border border-[#00ffaa]/25 bg-[#003840]/80 px-2.5 py-1.5 text-right">
                  <div className="text-[10px] text-cyan-100/70">
                    {isBn ? "সিলেক্টেড" : "Selected"}
                  </div>
                  <div className="text-sm font-black text-[#ffe600]">
                    {money(amountNumber || 0)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {amounts.map((a) => {
                  const active = amountNumber === a;

                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleAmountChange(a)}
                      className={`relative cursor-pointer rounded-lg border px-2 py-1.5 text-sm font-black transition-all ${
                        active
                          ? "border-[#ffe600] bg-gradient-to-b from-[#ffe600] to-[#f4a900] text-[#3b2300] shadow-md shadow-yellow-500/20"
                          : "border-[#00ffaa]/20 bg-[#003840]/50 text-white hover:border-[#00ffaa] hover:bg-[#00ffaa]/10"
                      }`}
                    >
                      ৳{a.toLocaleString("en-US")}
                      {active && (
                        <FaCheckCircle className="absolute -right-1 -top-1 rounded-full bg-black text-sm text-[#00ffaa]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-bold text-cyan-100/75">
                    {isBn ? "কাস্টম পরিমাণ" : "Custom Amount"}
                  </label>

                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="rounded-lg border border-[#00ffaa]/20 bg-[#003840]/70 px-2.5 py-2 text-sm font-black text-[#ffe600]">
                      ৳
                    </div>

                    <input
                      inputMode="numeric"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder={isBn ? "যেমন: 250" : "e.g. 250"}
                      className="w-full rounded-lg border border-[#00ffaa]/20 bg-[#003840]/55 px-3 py-2 text-sm font-black text-white outline-none placeholder-cyan-100/35 transition-all focus:border-[#ffe600] focus:ring-1 focus:ring-[#ffe600]/25"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#00ffaa]/20 bg-[#003840]/45 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-100/80">
                    <FaMoneyBillWave className="text-[#00ffaa]" />
                    {isBn ? "আপনার ডিপোজিট" : "Your Deposit"}
                  </div>

                  <div className="mt-1 text-lg font-black text-[#ffe600]">
                    {money(amountNumber || 0)}
                  </div>

                  <p className="mt-0.5 text-[11px] text-cyan-100/55">
                    {isBn ? "শুধু সংখ্যা লিখুন।" : "Only numbers are allowed."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#00ffaa]/20 bg-black/35 p-3">
              <div className="mb-2 flex items-center gap-2">
                <FaGift className="text-base text-[#ffe600]" />
                <h3 className="text-base font-black text-[#10f3c8]">
                  {isBn ? "ডিপোজিট বোনাস" : "Deposit Bonus"}
                </h3>
              </div>

              <select
                value={selectedBonusId}
                onChange={(e) => setSelectedBonusId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-[#00ffaa]/20 bg-[#003840]/70 px-3 py-2 text-sm font-bold text-white outline-none transition-all focus:border-[#ffe600] focus:ring-1 focus:ring-[#ffe600]/25"
              >
                <option className="bg-[#003840]" value="">
                  {isBn ? "কোনো বোনাস নয়" : "No Bonus"}
                </option>

                {bonuses.map((bonus) => (
                  <option
                    className="bg-[#003840]"
                    key={bonus._id}
                    value={bonus._id}
                  >
                    {getBonusTitle(bonus)} -{" "}
                    {bonus?.bonusType === "percent"
                      ? `${bonus?.bonusValue || 0}%`
                      : money(bonus?.bonusValue || 0)}{" "}
                    | Turnover {bonus?.turnoverMultiplier || 0}x
                  </option>
                ))}
              </select>

              {/* <div className="mt-3 rounded-lg border border-[#ffe600]/25 bg-[#ffe600]/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#ffe600]">
                    {isBn ? "বোনাস সামারি" : "Bonus Summary"}
                  </span>

                  <span className="max-w-[160px] truncate rounded-md bg-black/30 px-2 py-1 text-[10px] font-bold text-cyan-100">
                    {getBonusTitle(selectedBonus)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-black/25 p-2">
                    <div className="text-cyan-100/60">
                      {isBn ? "ডিপোজিট" : "Deposit"}
                    </div>
                    <div className="font-black text-white">
                      {money(amountNumber)}
                    </div>
                  </div>

                  <div className="rounded-md bg-black/25 p-2">
                    <div className="text-cyan-100/60">
                      {isBn ? "বোনাস" : "Bonus"}
                    </div>
                    <div className="font-black text-[#00ffaa]">
                      {money(bonusSummary.bonusAmount)}
                    </div>
                  </div>

                  <div className="rounded-md bg-black/25 p-2">
                    <div className="text-cyan-100/60">
                      {isBn ? "মোট" : "Total"}
                    </div>
                    <div className="font-black text-[#ffe600]">
                      {money(bonusSummary.totalCredited)}
                    </div>
                  </div>

                  <div className="rounded-md bg-black/25 p-2">
                    <div className="text-cyan-100/60">
                      {isBn ? "টার্নওভার" : "Turnover"}
                    </div>
                    <div className="font-black text-red-300">
                      {money(bonusSummary.requiredTurnover)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-semibold text-cyan-100/60">
                  {isBn
                    ? `Multiplier: ${bonusSummary.turnoverMultiplier}x`
                    : `Multiplier: ${bonusSummary.turnoverMultiplier}x`}
                </div>
              </div> */}
            </div>

            <button
              onClick={openConfirmModal}
              disabled={processing}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#00a97a] bg-gradient-to-b from-[#ffe600] to-[#f4a900] px-4 py-2.5 text-base font-black text-[#3b2300] shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? <FaSpinner className="animate-spin" /> : <FaBolt />}
              {isBn ? "Deposit Now" : "Deposit Now"}
            </button>

            <p className="pb-2 text-center text-[11px] font-medium text-cyan-100/55">
              {isBn
                ? "Deposit Now এ ক্লিক করলে আগে summary দেখাবে।"
                : "Click Deposit Now to review the summary first."}
            </p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm">
          <div className="my-auto w-full max-w-sm overflow-hidden rounded-xl border border-[#00ffaa]/25 bg-gradient-to-br from-[#001f24] via-[#003840] to-black text-white shadow-xl">
            <div className="border-b border-[#00ffaa]/25 bg-gradient-to-r from-[#0f727c] to-[#001f24] p-3">
              <h3 className="text-lg font-black text-[#ffe600]">
                {isBn ? "ডিপোজিট কনফার্ম করুন" : "Confirm Deposit"}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-cyan-100/80">
                {isBn
                  ? "ছোট সামারি দেখে Confirm করুন।"
                  : "Review the short summary before confirming."}
              </p>
            </div>

            <div className="p-3">
              <div className="rounded-lg border border-[#ffe600]/25 bg-[#ffe600]/10 p-3">
                <div className="mb-2 text-xs font-black text-[#ffe600]">
                  {isBn ? "ডিপোজিট সামারি" : "Deposit Summary"}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-cyan-100/70">
                      {isBn ? "এমাউন্ট" : "Amount"}
                    </span>
                    <b>{money(amountNumber)}</b>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-cyan-100/70">
                      {isBn ? "বোনাস" : "Bonus"}
                    </span>
                    <b className="text-[#00ffaa]">
                      {money(bonusSummary.bonusAmount)}
                    </b>
                  </div>

                  <div className="flex justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="font-bold text-yellow-100">
                      {isBn ? "মোট ক্রেডিট" : "Total Credit"}
                    </span>
                    <b className="text-[#ffe600]">
                      {money(bonusSummary.totalCredited)}
                    </b>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-cyan-100/70">
                      {isBn ? "টার্নওভার" : "Turnover"}
                    </span>
                    <b className="text-red-300">
                      {money(bonusSummary.requiredTurnover)}
                    </b>
                  </div>

                  <div className="truncate rounded-md bg-black/25 px-2 py-1.5 text-[11px] font-semibold text-cyan-100/70">
                    {getBonusTitle(selectedBonus)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#00ffaa]/20 bg-black/30 p-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={processing}
                className="cursor-pointer rounded-lg border border-[#00ffaa]/20 bg-[#003840]/60 py-2.5 text-sm font-black text-white transition-all hover:bg-[#00ffaa]/10 disabled:opacity-60"
              >
                {isBn ? "Cancel" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleConfirmDeposit}
                disabled={processing}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#00a97a] bg-gradient-to-b from-[#ffe600] to-[#f4a900] py-2.5 text-sm font-black text-[#3b2300] transition-all hover:scale-[1.02] disabled:opacity-60"
              >
                {processing && <FaSpinner className="animate-spin" />}
                {processing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoDeposit;
