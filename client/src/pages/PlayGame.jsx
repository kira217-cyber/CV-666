import { AuthContext } from "@/Context/AuthContext";
import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";
import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { FaRedoAlt, FaTimes } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:5002";

const PlayGame = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user, language } = useContext(AuthContext);

  const [gameUrl, setGameUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isBn = language === "bn";

  const t = {
    preparing: isBn
      ? "অনুগ্রহ করে অপেক্ষা করুন, গেম প্রস্তুত হচ্ছে..."
      : "Please wait, your game is being prepared...",
    refresh: isBn ? "রিফ্রেশ" : "Refresh",
    close: isBn ? "বন্ধ করুন" : "Close",
    loginFirst: isBn ? "খেলতে লগইন করুন" : "Please login to play",
    gameIdMissing: isBn ? "গেম আইডি পাওয়া যায়নি" : "Game ID not found",
    failed: isBn ? "গেম চালু হয়নি" : "Failed to launch game",
    noUrl: isBn ? "গেম URL পাওয়া যায়নি" : "No game URL received",
  };

  const loggedUser = useMemo(() => {
    if (user) return user;

    try {
      const localUser = localStorage.getItem("user");
      return localUser ? JSON.parse(localUser) : null;
    } catch {
      return null;
    }
  }, [user]);

  const userId =
    loggedUser?._id || loggedUser?.id || localStorage.getItem("userId") || "";

  const isLoggedIn = Boolean(loggedUser && userId);

  const launchGame = async () => {
    if (!id) {
      toast.error(t.gameIdMissing);
      navigate("/");
      return;
    }

    if (!isLoggedIn) {
      toast.error(t.loginFirst);
      setShowLoginModal(true);
      return;
    }

    try {
      setLoading(true);
      setGameUrl("");

      const { data } = await axios.post(`${API}/api/playgame`, {
        gameID: id,
        userId,
      });

      if (!data?.gameUrl) {
        toast.error(t.noUrl);
        navigate("/");
        return;
      }

      setGameUrl(data.gameUrl);
    } catch (error) {
      toast.error(error?.response?.data?.message || t.failed);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    launchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoggedIn, userId]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {loading && (
        <div className="absolute inset-0 z-[10000] flex flex-col items-center justify-center bg-black text-white">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00ffaa]/30 border-t-[#00ffaa]" />

          <p className="mt-5 text-center text-sm font-bold text-[#e0fff7]">
            {t.preparing}
          </p>

          <button
            type="button"
            onClick={launchGame}
            disabled={loading}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-60"
          >
            <FaRedoAlt className={loading ? "animate-spin" : ""} />
            {t.refresh}
          </button>
        </div>
      )}

      {!loading && gameUrl && (
        <iframe
          src={gameUrl}
          title="Game"
          className="h-full w-full border-0"
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          allowFullScreen
        />
      )}

      <button
        type="button"
        onClick={() => navigate("/")}
        className="fixed right-4 top-4 z-[10001] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white border border-white/20 hover:bg-red-600 transition-all"
        title={t.close}
      >
        <FaTimes />
      </button>

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}>
        <Login
          onClose={() => {
            setShowLoginModal(false);
            setTimeout(() => {
              window.location.reload();
            }, 200);
          }}
          onRegisterClick={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      </Modal>

      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      >
        <RegistrationModal
          onClose={() => setShowRegisterModal(false)}
          openLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      </Modal>
    </div>
  );
};

export default PlayGame;
