import { RxCaretLeft, RxCaretRight, RxCross2 } from "react-icons/rx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Grid } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/grid";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";
import { AuthContext } from "@/Context/AuthContext";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

const getUploadImage = (path = "") => {
  if (!path) return "/placeholder-game.png";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const getGameName = (game) => {
  return (
    game?.gameName ||
    game?.oracle?.name ||
    game?.name ||
    game?.gameName ||
    game?.title ||
    game?.gameId ||
    "Game"
  );
};

const getGameImage = (game) => {
  if (game?.gameImage) return game.gameImage;
  if (game?.image) return getUploadImage(game.image);
  if (game?.oracle?.image) return game.oracle.image;
  return "/placeholder-game.png";
};

const HotsGame = () => {
  const swiperRef = useRef(null);
  const navigate = useNavigate();
  const { user, language } = useContext(AuthContext);

  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const t = {
    en: {
      title: "Hot Games",
      viewAll: "View All",
      playNow: "PLAY NOW",
      playGame: "Play Game",
    },
    bn: {
      title: "গরম খেলা",
      viewAll: "সব দেখুন",
      playNow: "এখন খেলুন",
      playGame: "খেলুন",
    },
  };

  const translate = (key) => t?.[language]?.[key] || t.en[key];

  const fetchHotGames = async () => {
    try {
      const { data } = await axios.get(`${API}/api/public-games`, {
        params: {
          status: "active",
          isHot: true,
        },
      });

      const docs = Array.isArray(data?.data)
        ? data.data
        : data?.data?.games || [];

      setGames(docs);
    } catch {
      setGames([]);
    }
  };

  useEffect(() => {
    fetchHotGames();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const slidePrev = () => swiperRef.current?.slidePrev();
  const slideNext = () => swiperRef.current?.slideNext();

  const handlePlayClick = (game) => {
    const targetGame = game || selectedGame;
    if (!targetGame) return;

    if (!user) {
      setShowRegisterModal(false);
      setShowLoginModal(true);
      return;
    }

    navigate(`/liveGame/${targetGame.gameId}`);
    setSelectedGame(null);
  };

  const handleCardClick = (game) => {
    if (isMobile) {
      setSelectedGame(game);
      return;
    }

    handlePlayClick(game);
  };

  useEffect(() => {
    if (!games.length) return;

    let animationFrameId = null;
    let timeoutId = null;

    const triggerShine = () => {
      const cards = document.querySelectorAll(".hot-auto-shine");

      cards.forEach((card) => {
        if (card instanceof HTMLElement) {
          card.classList.remove("hot-shine-animate");
          void card.offsetWidth;
          card.classList.add("hot-shine-animate");
        }
      });

      timeoutId = setTimeout(() => {
        if (!document.hidden) {
          animationFrameId = requestAnimationFrame(triggerShine);
        } else {
          timeoutId = setTimeout(triggerShine, 3000);
        }
      }, 3000);
    };

    const startDelay = setTimeout(triggerShine, 1000);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutId);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [games.length]);

  if (!games.length) return null;

  return (
    <div className="max-w-5xl mx-auto mb-8 game-card-container relative">
      <div className="flex justify-between items-center mb-4 lg:mb-3 mt-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#10f3c8] uppercase">
          {translate("title")}
        </h2>

        <div className="flex items-center gap-2">
          <Link
            to="/hot-games"
            className="px-3 py-1.5 text-sm font-bold rounded-lg bg-gradient-to-b from-[#0f727c] to-[#004e56] border-2 border-[#00a97a] text-[#ffe600] hover:bg-yellow-400 hover:text-white transition-all shadow-lg cursor-pointer"
          >
            {translate("viewAll")}
          </Link>

          <button
            type="button"
            onClick={slidePrev}
            className="p-1.5 rounded-lg bg-[#003840]/80 hover:bg-[#00ffaa]/20 border border-[#00ffaa]/30 text-white transition-all cursor-pointer"
          >
            <RxCaretLeft size={20} />
          </button>

          <button
            type="button"
            onClick={slideNext}
            className="p-1.5 rounded-lg bg-[#003840]/80 hover:bg-[#00ffaa]/20 border border-[#00ffaa]/30 text-white transition-all cursor-pointer"
          >
            <RxCaretRight size={20} />
          </button>
        </div>
      </div>

      <Swiper
        modules={[Navigation, Grid]}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        observer={true}
        observeParents={true}
        spaceBetween={8}
        grid={{
          rows: 2,
          fill: "row",
        }}
        slidesPerView={5}
        breakpoints={{
          0: { slidesPerView: 3, spaceBetween: 8 },
          480: { slidesPerView: 3.5, spaceBetween: 10 },
          768: { slidesPerView: 4.5, spaceBetween: 12 },
          1024: { slidesPerView: 5.3, spaceBetween: 14 },
          1440: { slidesPerView: 5.3, spaceBetween: 16 },
        }}
        className="swiper-container"
        style={{ padding: "0 5px" }}
      >
        {games.map((game, index) => (
          <SwiperSlide key={game._id || game.gameId || index}>
            <div
              className="relative group overflow-hidden rounded-xl shadow-2xl cursor-pointer transition-all duration-500 hover:scale-105 hot-auto-shine"
              style={{
                width: "100%",
                aspectRatio: "3/4",
                background: "linear-gradient(135deg, #0a3d42, #001f24)",
                boxShadow: "0 8px 20px rgba(0, 255, 200, 0.15)",
              }}
              onClick={() => handleCardClick(game)}
            >
              <div className="hot-shine-layer"></div>

              <div className="w-full h-full">
                <img
                  src={getGameImage(game)}
                  alt={getGameName(game)}
                  className="w-full h-full object-cover rounded-xl border-2 border-white"
                  // onError={(e) => {
                  //   e.currentTarget.src = "/placeholder-game.png";
                  // }}
                />
              </div>

              <div className="absolute inset-0 hidden md:flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 px-1 uppercase">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePlayClick(game);
                  }}
                  className="py-0.5 px-1 text-[16px] font-bold text-[#b64100] bg-[#ffd900] rounded-md mb-1 transform scale-50 group-hover:scale-100 group-hover:py-1 group-hover:px-2 group-hover:text-[16px] transition-all duration-700 ease-in-out cursor-pointer"
                >
                  {translate("playNow")}
                </button>

                <p className="text-white text-[10px] font-semibold text-center line-clamp-2">
                  {getGameName(game)}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {isMobile && selectedGame && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t-4 border-[#00ffaa] shadow-2xl transition-transform duration-300">
          <div className="flex flex-col p-4">
            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black cursor-pointer"
            >
              <RxCross2 size={28} />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <img
                src={getGameImage(selectedGame)}
                className="w-24 h-24 object-cover rounded-xl shadow-lg border-2 border-[#00ffaa] -mt-12"
                alt={getGameName(selectedGame)}
                // onError={(e) => {
                //   e.currentTarget.src = "/placeholder-game.png";
                // }}
              />

              <h3 className="text-lg font-bold text-gray-800 truncate">
                {getGameName(selectedGame)}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handlePlayClick(selectedGame)}
              className="w-full py-1 md:py-4 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              {translate("playGame")}
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}>
        <Login
          onClose={() => setShowLoginModal(false)}
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

      <style>{`
        .hot-auto-shine {
          position: relative;
          overflow: hidden;
        }

        .hot-shine-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 30%, white 50%, transparent 70%);
          transform: translateX(-150%);
          pointer-events: none;
          border-radius: inherit;
        }

        .hot-shine-animate .hot-shine-layer {
          animation: hotShineSwipe 1.4s ease-out forwards;
        }

        @keyframes hotShineSwipe {
          0% {
            transform: translateX(-150%) skewX(-15deg);
          }
          100% {
            transform: translateX(150%) skewX(-15deg);
          }
        }
      `}</style>
    </div>
  );
};

export default HotsGame;
