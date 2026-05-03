// src/components/login/RegistrationModal.jsx
import { useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import toast from "react-hot-toast";
import {
  FaFacebookF,
  FaGoogle,
  FaEye,
  FaEyeSlash,
  FaPhoneAlt,
  FaLock,
  FaGift,
  FaTimes,
} from "react-icons/fa";
import { AuthContext } from "@/Context/AuthContext";

const RegistrationModal = ({ onClose, openLogin, initialReferral }) => {
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferral || "");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { setUser, language } = useContext(AuthContext);
  const navigate = useNavigate();

  const isBn = language === "bn";

  const t = {
    title: isBn ? "নিবন্ধন" : "Registration",
    haveAccount: isBn ? "অ্যাকাউন্ট আছে?" : "Already have an account?",
    login: isBn ? "লগইন করুন" : "Login",
    whatsapp: isBn ? "ফোন নম্বর" : "Phone Number",
    password: isBn ? "পাসওয়ার্ড" : "Password",
    confirmPassword: isBn ? "কনফার্ম পাসওয়ার্ড" : "Confirm Password",
    referral: isBn ? "রেফার কোড (ঐচ্ছিক)" : "Referral Code (Optional)",
    terms: isBn
      ? "আমি ১৮+ এবং শর্তাবলীতে সম্মত"
      : "I am 18+ and agree to the terms",
    loading: isBn ? "লোডিং..." : "Loading...",
    submit: isBn ? "নিবন্ধন" : "Register",
    or: isBn ? "অথবা" : "OR",
    fillAll: isBn ? "সবগুলো ঘর পূরণ করুন" : "Please fill all fields",
    passwordNotMatch: isBn ? "পাসওয়ার্ড মেলেনি" : "Passwords do not match",
    agreeTerms: isBn ? "শর্তাবলীতে সম্মতি দিন" : "Please agree to the terms",
    welcome: isBn ? "স্বাগতম" : "Welcome",
    failed: isBn ? "রেজিস্ট্রেশন ব্যর্থ হয়েছে" : "Registration failed",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanWhatsapp = whatsapp.trim();
    const cleanReferral = referralCode.trim().toUpperCase();

    if (!cleanWhatsapp || !password || !confirmPassword) {
      toast.error(t.fillAll);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t.passwordNotMatch);
      return;
    }

    if (!agree) {
      toast.error(t.agreeTerms);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/main/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatsapp: cleanWhatsapp,
            password,
            referral: cleanReferral || undefined,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t.failed);
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user.id || data.user._id);

      setUser(data.user);

      toast.success(`${t.welcome} ${data.user.username}`);

      onClose();

      navigate(data.user.role === "user" ? "/" : "/pending-approval");
    } catch (err) {
      toast.error(err.message || t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/10 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-[95%] max-w-[400px] my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-2 z-[1000] w-9 h-9 rounded-full bg-gradient-to-t from-[#b8860b] to-[#ffee58] flex items-center justify-center text-black shadow-[0_3px_0_#5d4037] border border-[#fff3b0] active:translate-y-1 active:shadow-none transition-all"
        >
          <FaTimes size={18} />
        </button>

        <div className="w-full rounded-[30px] bg-[#014A52] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-b-[6px] border-r-[4px] border-[#003138]">
          <div className="text-white">
            <h2 className="text-3xl font-black text-[#ffcc00] mb-1 tracking-tight drop-shadow-[1px_2px_2px_black]">
              {t.title}
            </h2>

            <p className="text-[13px] mb-6 font-medium text-gray-300">
              {t.haveAccount}{" "}
              <span
                onClick={() => {
                  onClose();
                  openLogin();
                }}
                className="text-[#00ffd0] cursor-pointer hover:underline font-bold"
              >
                {t.login}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaPhoneAlt size={15} />
                </span>
                <input
                  type="text"
                  placeholder={t.whatsapp}
                  value={whatsapp}
                  disabled={loading}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all text-sm disabled:opacity-70"
                />
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaLock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password}
                  value={password}
                  disabled={loading}
                  className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all text-sm disabled:opacity-70"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00ffd0] disabled:opacity-70"
                >
                  {showPassword ? (
                    <FaEyeSlash size={16} />
                  ) : (
                    <FaEye size={16} />
                  )}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaLock size={15} />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.confirmPassword}
                  value={confirmPassword}
                  disabled={loading}
                  className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all text-sm disabled:opacity-70"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00ffd0] disabled:opacity-70"
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash size={16} />
                  ) : (
                    <FaEye size={16} />
                  )}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaGift size={15} />
                </span>
                <input
                  type="text"
                  placeholder={t.referral}
                  value={referralCode}
                  readOnly={!!initialReferral}
                  disabled={loading}
                  onChange={(e) =>
                    setReferralCode(e.target.value.toUpperCase())
                  }
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all text-sm disabled:opacity-70 read-only:opacity-80"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-[#00ffd0] flex items-center justify-center ${
                    agree ? "bg-[#00ffd0]" : "bg-transparent"
                  }`}
                >
                  {agree && (
                    <div className="w-1.5 h-1.5 bg-[#014A52] rounded-full" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={agree}
                  disabled={loading}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="hidden"
                />
                <span className="text-[12px] text-gray-200">{t.terms}</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-full font-black text-xl text-[#5d4037] uppercase tracking-wide transition-all transform active:translate-y-1 active:shadow-none shadow-[0_5px_0_#8b4513,0_8px_15px_rgba(0,0,0,0.4)] ${
                  loading
                    ? "opacity-70 bg-gray-400 shadow-none cursor-not-allowed"
                    : "bg-gradient-to-b from-[#fff3b0] via-[#ffcc00] to-[#b8860b]"
                }`}
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>

            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-teal-900/50" />
              <span className="flex-shrink mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                {t.or}
              </span>
              <div className="flex-grow border-t border-teal-900/50" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#e53935] text-white font-bold text-[12px] shadow-[0_3px_0_#b71c1c] active:translate-y-0.5 active:shadow-none transition-all"
              >
                <FaGoogle /> Google
              </button>

              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#3949ab] text-white font-bold text-[12px] shadow-[0_3px_0_#1a237e] active:translate-y-0.5 active:shadow-none transition-all"
              >
                <FaFacebookF /> Facebook
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
