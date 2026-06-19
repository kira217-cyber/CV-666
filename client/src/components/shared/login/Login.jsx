// src/components/login/Login.jsx
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaEye,
  FaEyeSlash,
  FaLock,
  FaGoogle,
  FaFacebookF,
  FaTimes,
  FaPhoneAlt,
} from "react-icons/fa";
import { AuthContext } from "@/Context/AuthContext";

const Login = ({ onClose, onRegisterClick }) => {
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { setUser, language } = useContext(AuthContext);
  const navigate = useNavigate();

  const isBn = language === "bn";

  const t = {
    title: isBn ? "লগইন" : "Login",
    noAccount: isBn ? "অ্যাকাউন্ট নেই?" : "Don't have an account?",
    register: isBn ? "নিবন্ধন করুন" : "Register",
    whatsapp: isBn ? "ফোন নম্বর" : "Phone Number",
    password: isBn ? "পাসওয়ার্ড" : "Password",
    remember: isBn ? "মনে রাখুন" : "Remember me",
    forgot: isBn ? "পাসওয়ার্ড ভুলে গিয়েছেন" : "Forgot password?",
    loading: isBn ? "লোডিং..." : "Loading...",
    login: isBn ? "লগইন" : "Login",
    or: isBn ? "অথবা" : "OR",
    fill: isBn
      ? "ফোন নম্বর এবং পাসওয়ার্ড দিন"
      : "Please enter Phone number and password",
    success: isBn ? "সফলভাবে লগইন হয়েছে!" : "Logged in successfully!",
    failed: isBn ? "লগইন ব্যর্থ হয়েছে" : "Login failed",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanWhatsapp = whatsapp.trim();

    if (!cleanWhatsapp || !password) {
      toast.error(t.fill);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: cleanWhatsapp, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || t.failed);
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user.id || data.user._id);

      const token =
        data?.token ||
        data?.accessToken ||
        data?.jwt ||
        data?.data?.token ||
        data?.data?.accessToken ||
        "";

      if (token) {
        localStorage.setItem("token", token);
      }

      setUser(data.user);

      toast.success(t.success);
      onClose();
      navigate("/");

      setTimeout(() => window.location.reload(), 200);
    } catch (err) {
      toast.error(err.message || t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/10 backdrop-blur-sm p-4">
      <div className="relative w-[92%] max-w-[380px] transition-all duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-2 z-[1000] w-9 h-9 rounded-full bg-gradient-to-t from-[#b8860b] to-[#ffee58] flex items-center justify-center text-black shadow-[0_3px_0_#5d4037] border border-[#fff3b0] active:translate-y-1 active:shadow-none transition-all"
        >
          <FaTimes size={18} />
        </button>

        <div className="w-full rounded-[25px] bg-[#014A52] p-6 md:p-8 shadow-[0_15px_35px_rgba(0,0,0,0.7)] border-b-[6px] border-r-[4px] border-[#003138]">
          <div className="text-white">
            <h2 className="text-3xl font-black text-[#ffcc00] mb-1 tracking-tight drop-shadow-[1px_2px_2px_black]">
              {t.title}
            </h2>

            <p className="text-[13px] mb-6 font-medium text-gray-300">
              {t.noAccount}{" "}
              <span
                onClick={() => {
                  onClose();
                  onRegisterClick();
                }}
                className="text-[#00ffd0] cursor-pointer hover:underline font-bold"
              >
                {t.register}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaPhoneAlt size={16} />
                </span>

                <input
                  type="text"
                  placeholder={t.whatsapp}
                  value={whatsapp}
                  disabled={loading}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all disabled:opacity-70"
                />
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ffd0] z-10">
                  <FaLock size={16} />
                </span>

                <input
                  type={showPass ? "text" : "password"}
                  placeholder={t.password}
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-[#002b32] text-white placeholder-[#00ffd0]/40 outline-none border border-[#003d45] shadow-[inset_0_4px_6px_rgba(0,0,0,0.5)] focus:border-[#00ffd0]/50 transition-all disabled:opacity-70"
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#00ffd0] disabled:opacity-70"
                >
                  {showPass ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>

              <div className="flex justify-between items-center text-[13px] px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-[#00ffd0] flex items-center justify-center ${
                      remember ? "bg-[#00ffd0]" : "bg-transparent"
                    }`}
                  >
                    {remember && (
                      <div className="w-1.5 h-1.5 bg-[#014A52] rounded-full" />
                    )}
                  </div>

                  <input
                    type="checkbox"
                    checked={remember}
                    disabled={loading}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="hidden"
                  />

                  <span className="text-gray-200">{t.remember}</span>
                </label>

                <span className="text-[#ffcc00] font-bold cursor-pointer">
                  {t.forgot}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-full font-black text-xl text-[#5d4037] uppercase tracking-wide transition-all transform active:translate-y-1 active:shadow-none shadow-[0_5px_0_#8b4513,0_8px_15px_rgba(0,0,0,0.4)] ${
                  loading
                    ? "opacity-70 bg-gray-400 shadow-none cursor-not-allowed"
                    : "bg-gradient-to-b from-[#fff3b0] via-[#ffcc00] to-[#b8860b]"
                }`}
              >
                {loading ? t.loading : t.login}
              </button>
            </form>

            <div className="relative flex items-center py-7">
              <div className="flex-grow border-t border-teal-900/50" />
              <span className="flex-shrink mx-3 text-gray-400 text-[11px] font-bold uppercase">
                {t.or}
              </span>
              <div className="flex-grow border-t border-teal-900/50" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#e53935] text-white font-bold text-sm shadow-[0_3px_0_#b71c1c] active:translate-y-0.5 active:shadow-none transition-all"
              >
                <FaGoogle /> Google
              </button>

              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3949ab] text-white font-bold text-sm shadow-[0_3px_0_#1a237e] active:translate-y-0.5 active:shadow-none transition-all"
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

export default Login;
