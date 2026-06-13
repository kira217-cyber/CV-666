import MarqueeSlider from "@/components/home/Marque/MarqueeSlider";
import { useEffect, useRef, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";
import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

const ORACLE_BASE = "https://api.oraclegames.live/api";
const ORACLE_KEY = import.meta.env.VITE_ORACLE_TOKEN;
const GAMES_PER_PAGE = 30;

const PaginationButton = ({ disabled, onClick, children, active }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "bg-[#ffe600] text-black border border-[#fff2a6]"
        : "bg-[#003840] text-[#e0fff7] border border-[#006165] hover:bg-[#0a6670]"
    }`}
  >
    {children}
  </button>
);

const HotGame = () => {
  const navigate = useNavigate();
  const { language, user } = useContext(AuthContext);

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const getUploadImage = (path = "") => {
    if (!path) return "/placeholder-game.png";
    if (/^https?:\/\//i.test(path)) return path;
    return `${API}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const fetchOracleDetails = async (gameDocs = []) => {
    const ids = gameDocs.map((item) => item.gameId).filter(Boolean);
    if (!ids.length) return gameDocs;

    try {
      const { data } = await axios.post(
        `${ORACLE_BASE}/games/by-ids`,
        { ids },
        {
          headers: {
            "x-api-key": ORACLE_KEY,
          },
        },
      );

      const oracleGames = data?.data || data?.games || [];
      const map = new Map();

      oracleGames.forEach((item) => {
        const id = item?._id || item?.id || item?.gameId || item?.gameID;
        if (id) map.set(String(id), item);
      });

      return gameDocs.map((doc) => ({
        ...doc,
        apiData: map.get(String(doc.gameId)) || null,
      }));
    } catch {
      return gameDocs;
    }
  };

  const fetchHotGames = async () => {
    try {
      setLoadingGames(true);

      const { data } = await axios.get(
        `${API}/api/games?status=active&isHot=true`,
      );

      const docs = data?.data || [];
      const withOracle = await fetchOracleDetails(docs);

      setGames(withOracle);
      setCurrentPage(1);
    } catch {
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    fetchHotGames();
  }, []);

  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const paginatedGames = games.slice(startIndex, startIndex + GAMES_PER_PAGE);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getGameName = (game) => {
    return (
      game?.apiData?.name ||
      game?.apiData?.gameName ||
      game?.name ||
      game?.gameName ||
      game?.title ||
      game?.gameId ||
      "Unknown Game"
    );
  };

  const getGameImage = (game) => {
    if (game?.image) {
      return getUploadImage(game.image);
    }

    const imgPath =
      game?.apiData?.image ||
      game?.apiData?.img ||
      game?.apiData?.thumbnail ||
      game?.imageUrl ||
      game?.img ||
      game?.thumbnail ||
      "";

    if (!imgPath) return "/placeholder-game.png";
    if (/^https?:\/\//i.test(imgPath)) return imgPath;

    return `${ORACLE_BASE.replace("/api", "")}/${imgPath}`;
  };

  const handlePlayGame = (game) => {
    if (!user) {
      setShowRegisterModal(true);
      return;
    }

    navigate(`/liveGame/${game.gameId}`);
  };

  useEffect(() => {
    if (paginatedGames.length === 0) return;

    let animationFrameId = null;
    let timeoutId = null;

    const triggerShine = () => {
      const cards = document.querySelectorAll(".auto-shine");

      cards.forEach((card) => {
        if (card instanceof HTMLElement) {
          card.classList.remove("shine-animate");
          void card.offsetWidth;
          card.classList.add("shine-animate");
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
  }, [paginatedGames.length, currentPage]);

  return (
    <div className="px-1 sm:px-4 submenu-page-container">
      <MarqueeSlider />

      <div
        className="relative bg-[#004E56] shadow-md w-full max-w-5xl mx-auto my-2 lg:my-4 p-2 rounded-2xl border border-[rgba(0,28,44,.4)] overflow-hidden"
        style={{
          boxShadow: "0 1px 0 0 #001c2c, inset 0 2px 0 0 #006165",
          zIndex: 5,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: "flex-start",
            flexDirection: window.innerWidth < 768 ? "column" : "row",
          }}
        >
          <div>
            <h2
              style={{
                justifySelf: "flex-start",
                padding: "unset",
                marginRight: window.innerWidth < 768 ? "0" : "100px",
                fontSize: "24px",
                fontWeight: "700",
                color: "#23ffc8",
                textTransform: "uppercase",
              }}
            >
              {language === "bn" ? "গরম খেলা" : "Hot Games"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-2">
          {loadingGames ? (
            <div className="col-span-3 md:col-span-5 py-12 text-center text-white font-bold">
              Loading games...
            </div>
          ) : paginatedGames.length === 0 ? (
            <div className="col-span-3 md:col-span-5 py-12 text-center text-white font-bold">
              No hot games found
            </div>
          ) : (
            paginatedGames.map((game, index) => (
              <div
                key={game._id || index}
                className="relative group overflow-hidden rounded-lg xl:rounded-xl shadow-2xl cursor-pointer transition-all duration-500 hover:scale-105 auto-shine"
                style={{
                  aspectRatio: "3/4",
                  background: "linear-gradient(135deg, #0a3d42, #001f24)",
                  boxShadow: "0 8px 20px rgba(0, 255, 200, 0.15)",
                }}
                onClick={() => handlePlayGame(game)}
              >
                <div className="shine-layer"></div>

                <img
                  src={getGameImage(game)}
                  alt={getGameName(game)}
                  className="w-full h-full object-cover rounded-lg xl:rounded-xl transition-transform duration-500 group-hover:scale-110 group-hover:blur-[2px]"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-game.png";
                  }}
                />

                {game?.showHeart && (
                  <Link
                    to={game?.heartLink || "#"}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute top-2 right-2 bg-[#ffffff45] bg-opacity-80 rounded-full p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                  </Link>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 px-2">
                  <div className="py-1 px-2 md:py-2 md:px-4 text-[12px] md:text-base font-bold text-[#b64100] bg-[#ffd900] rounded-lg shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    {language === "bn" ? "এখন খেলুন" : "PLAY NOW"}
                  </div>

                  <p className="mt-3 text-white text-xs md:text-sm font-semibold text-center">
                    {getGameName(game)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5 pb-2">
            <PaginationButton
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Prev
            </PaginationButton>

            {getPageNumbers().map((page) => (
              <PaginationButton
                key={page}
                active={page === currentPage}
                onClick={() => goToPage(page)}
              >
                {page}
              </PaginationButton>
            ))}

            <PaginationButton
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </PaginationButton>
          </div>
        )}
      </div>

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
        .auto-shine {
          position: relative;
          overflow: hidden;
        }

        .shine-layer {
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 30%, white 50%, transparent 70%);
          transform: translateX(-150%);
          pointer-events: none;
          border-radius: inherit;
        }

        .shine-animate .shine-layer {
          animation: shineSwipe 1.4s ease-out forwards;
        }

        @keyframes shineSwipe {
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

export default HotGame;
