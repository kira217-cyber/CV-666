import MarqueeSlider from "@/components/home/Marque/MarqueeSlider";
import { AuthContext } from "@/Context/AuthContext";
import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";

import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

const GAMES_PER_PAGE = 50;

const getUploadImage = (path = "") => {
  if (!path) return "/placeholder-game.png";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const getGameName = (game) =>
  game?.gameName || game?.oracle?.name || game?.name || game?.gameId || "Game";

const getGameImage = (game) => {
  if (game?.gameImage) return game.gameImage;
  if (game?.image) return getUploadImage(game.image);
  if (game?.oracle?.image) return game.oracle.image;

  return "/placeholder-game.png";
};

const extractGames = (responseData) => {
  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.data?.games)) {
    return responseData.data.games;
  }

  return [];
};

const extractMeta = (responseData) => {
  const meta = responseData?.data?.meta;

  if (!meta || typeof meta !== "object") {
    return {
      page: 1,
      limit: GAMES_PER_PAGE,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  return {
    page: Number(meta.page) || 1,
    limit: Number(meta.limit) || GAMES_PER_PAGE,
    total: Number(meta.total) || 0,
    totalPages: Math.max(Number(meta.totalPages) || 1, 1),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPreviousPage: Boolean(meta.hasPreviousPage),
  };
};

const HotGames = () => {
  const navigate = useNavigate();
  const { user, language } = useContext(AuthContext);

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    limit: GAMES_PER_PAGE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchHotGames = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get(`${API}/api/public-games`, {
          params: {
            status: "active",
            isHot: true,
            page: currentPage,
            limit: GAMES_PER_PAGE,
          },
          signal: controller.signal,
        });

        const docs = extractGames(data);
        const meta = extractMeta(data);

        if (!controller.signal.aborted) {
          setGames(docs);
          setPaginationMeta(meta);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
          return;
        }

        setGames([]);

        setPaginationMeta({
          page: currentPage,
          limit: GAMES_PER_PAGE,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: currentPage > 1,
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchHotGames();

    return () => {
      controller.abort();
    };
  }, [currentPage]);

  const totalPages = paginationMeta.totalPages || 1;

  const visiblePages = useMemo(() => {
    const pages = [];

    for (let page = 1; page <= totalPages; page += 1) {
      if (
        page === 1 ||
        page === totalPages ||
        Math.abs(page - currentPage) <= 1
      ) {
        pages.push(page);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const handlePlayClick = useCallback(
    (game) => {
      if (!game) return;

      if (!user) {
        setShowRegisterModal(false);
        setShowLoginModal(true);
        return;
      }

      navigate(`/liveGame/${game.gameId}`);
    },
    [navigate, user],
  );

  const goToPage = useCallback(
    (page) => {
      if (page < 1 || page > totalPages || page === currentPage || loading) {
        return;
      }

      setCurrentPage(page);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [currentPage, loading, totalPages],
  );

  return (
    <div className="min-h-screen pb-20">
      <MarqueeSlider />

      <div className="mx-auto max-w-5xl px-2 pt-4">
        <div className="mb-4 flex items-start justify-between">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-[#10f3c8] uppercase">
            {language === "bn" ? "গরম খেলা" : "Hot Games"}
          </h1>

          {/* <div className="text-xs font-bold text-[#e0fff7]/80">
            {paginationMeta.total}{" "}
            {language === "bn" ? "গেম" : "Games"}
          </div> */}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 sm:h-44 rounded-xl bg-[#003840] animate-pulse border border-[#006165]"
              />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-xl border border-[#006165] bg-[#003840] py-10 text-center text-[#e0fff7]">
            {language === "bn"
              ? "কোনো হট গেম পাওয়া যায়নি"
              : "No hot games found"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {games.map((game, index) => (
                <div
                  key={game?._id || game?.gameId || index}
                  onClick={() => handlePlayClick(game)}
                  className="relative group overflow-hidden rounded-xl shadow-2xl cursor-pointer transition-all duration-500 hover:scale-105"
                  style={{
                    width: "100%",
                    aspectRatio: "3/4",
                    background: "linear-gradient(135deg, #0a3d42, #001f24)",
                    boxShadow: "0 8px 20px rgba(0, 255, 200, 0.15)",
                  }}
                >
                  <img
                    src={getGameImage(game)}
                    alt={getGameName(game)}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-xl border-2 border-white"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = "/placeholder-game.png";
                    }}
                  />

                  <div className="absolute inset-0 hidden md:flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 px-1 uppercase">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePlayClick(game);
                      }}
                      className="py-0.5 px-1 text-[16px] font-bold text-[#b64100] bg-[#ffd900] rounded-md mb-1 transform scale-50 group-hover:scale-100 group-hover:py-1 group-hover:px-2 group-hover:text-[16px] transition-all duration-700 ease-in-out cursor-pointer"
                    >
                      {language === "bn" ? "এখন খেলুন" : "PLAY NOW"}
                    </button>

                    {/* <p className="text-white text-[10px] font-semibold text-center line-clamp-2">
                      {getGameName(game)}
                    </p> */}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => goToPage(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#003840] text-[#e0fff7] border border-[#006165] hover:bg-[#0a6670] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {language === "bn" ? "আগে" : "Prev"}
                </button>

                {visiblePages.map((page, index) => {
                  const previousPage = visiblePages[index - 1];
                  const showEllipsis = previousPage && page - previousPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-2">
                      {showEllipsis && (
                        <span className="px-2 text-[#e0fff7]/70 font-bold">
                          ...
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                          page === currentPage
                            ? "bg-[#ffe600] text-black border-[#fff2a6]"
                            : "bg-[#003840] text-[#e0fff7] border-[#006165] hover:bg-[#0a6670]"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages || loading}
                  onClick={() => goToPage(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#003840] text-[#e0fff7] border border-[#006165] hover:bg-[#0a6670] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {language === "bn" ? "পরে" : "Next"}
                </button>
              </div>
            )}
          </>
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
    </div>
  );
};

export default HotGames;
