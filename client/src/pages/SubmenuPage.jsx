import MarqueeSlider from "@/components/home/Marque/MarqueeSlider";
import {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { BsFire } from "react-icons/bs";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";
import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

const GAMES_PER_PAGE = 50;

const getUploadImage = (path = "") => {
  if (!path) return "";

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

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  color: rgb(255, 255, 255);
  font-size: 1rem;
  padding: 2px 4px;
  margin-bottom: 0;
  align-items: flex-end;

  img {
    width: 4rem;
    height: 4rem;
    object-fit: contain;
    border-radius: 0.25rem;
  }

  @media (min-width: 1024px) {
    font-size: 1.25rem;
    margin-bottom: 0.25rem;

    img {
      width: 4rem;
      height: 1.25rem;
    }
  }
`;

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: 0.2s;
  flex-shrink: 0;
  gap: 8px;
  height: 32px;
  padding: 0 5px;
  background: ${({ isSelected }) =>
    isSelected
      ? "linear-gradient(180deg, #ffe600, #ffb800)"
      : "linear-gradient(180deg, #0f727c, #004e56)"};
  border: 1px solid
    ${({ isSelected }) =>
      isSelected ? "rgba(255, 242, 166, .5)" : "rgba(35, 255, 200, 0.1)"};
  border-radius: 8px;
  box-shadow: ${({ isSelected }) =>
    isSelected
      ? "0 1px 0 0 #b64100, inset 0 1px 0 1px #fff2a6"
      : "0 1px 0 0 #005540"};
  color: ${({ isSelected }) => (isSelected ? "#000" : "#fff")};

  &:hover {
    background: ${({ isSelected }) =>
      isSelected
        ? "linear-gradient(180deg, #ffe600, #ffb800)"
        : "linear-gradient(180deg, #1a8a94, #006165)"};
  }
`;

const SwiperContainer = styled.div`
  width: 100%;
  height: 40px;
  padding: 0 10px;
  background: #002632;
  border: 1px solid #006165;
  border-radius: 10px;
  box-shadow: 0 2px 0 0 #002631;
  overflow: hidden;
  position: relative;
  z-index: 10;

  .swiper {
    height: 100%;
  }

  .swiper-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
  }
`;

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

const SubmenuPage = () => {
  const navigate = useNavigate();
  const swiperRef = useRef(null);

  const { submenu, categoryId } = useParams();
  const routeCategoryId = categoryId || submenu;

  const { language, user } = useContext(AuthContext);

  const [selectedProviderId, setSelectedProviderId] = useState("all");

  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [gamesWithOracle, setGamesWithOracle] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);

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

  const allButtonLabel = language === "bn" ? "সব" : "All";

  useEffect(() => {
    if (!routeCategoryId) {
      setCategory(null);
      setProviders([]);
      return undefined;
    }

    const controller = new AbortController();

    const loadCategoryAndProviders = async () => {
      try {
        setLoading(true);

        const [providerRes, categoryRes] = await Promise.all([
          axios.get(`${API}/api/public-games/providers/active`, {
            params: {
              categoryId: routeCategoryId,
            },
            signal: controller.signal,
          }),

          axios
            .get(`${API}/api/public-games/categories/active`, {
              signal: controller.signal,
            })
            .catch((error) => {
              if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
                throw error;
              }

              return null;
            }),
        ]);

        const providerData = Array.isArray(providerRes?.data?.data)
          ? providerRes.data.data
          : [];

        setProviders(providerData);

        const categoryList = Array.isArray(categoryRes?.data?.data)
          ? categoryRes.data.data
          : [];

        const foundCategory = categoryList.find(
          (item) => String(item?._id) === String(routeCategoryId),
        );

        if (foundCategory) {
          setCategory(foundCategory);
        } else if (providerData?.[0]?.categoryId) {
          setCategory(providerData[0].categoryId);
        } else {
          setCategory(null);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
          return;
        }

        setCategory(null);
        setProviders([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    setSelectedProviderId("all");
    setCurrentPage(1);
    setGamesWithOracle([]);

    setPaginationMeta({
      page: 1,
      limit: GAMES_PER_PAGE,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    loadCategoryAndProviders();

    return () => {
      controller.abort();
    };
  }, [routeCategoryId]);

  useEffect(() => {
    if (!routeCategoryId) {
      setGamesWithOracle([]);
      return undefined;
    }

    const controller = new AbortController();

    const loadGames = async () => {
      try {
        setLoadingGames(true);

        const params =
          selectedProviderId === "all"
            ? {
                status: "active",
                categoryId: routeCategoryId,
                page: currentPage,
                limit: GAMES_PER_PAGE,
              }
            : {
                status: "active",
                providerDbId: selectedProviderId,
                page: currentPage,
                limit: GAMES_PER_PAGE,
              };

        const { data } = await axios.get(`${API}/api/public-games`, {
          params,
          signal: controller.signal,
        });

        const docs = extractGames(data);
        const meta = extractMeta(data);

        setGamesWithOracle(docs);
        setPaginationMeta(meta);
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
          return;
        }

        setGamesWithOracle([]);

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
          setLoadingGames(false);
        }
      }
    };

    loadGames();

    return () => {
      controller.abort();
    };
  }, [routeCategoryId, selectedProviderId, currentPage]);

  const subOption = useMemo(() => {
    const allItem = {
      id: "all",
      label: allButtonLabel,
      icon: (
        <span
          className="text-black"
          style={{
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {allButtonLabel}
        </span>
      ),
    };

    const providerItems = providers.map((provider) => ({
      id: provider._id,
      label: provider?.providerId || "Provider",
      icon: provider?.providerIcon ? (
        getUploadImage(provider.providerIcon)
      ) : (
        <BsFire />
      ),
    }));

    return [allItem, ...providerItems];
  }, [providers, allButtonLabel]);

  const categoryTitle = useMemo(() => {
    if (language === "bn") {
      return (
        category?.categoryName?.bn || category?.categoryName?.en || "Games"
      );
    }

    return category?.categoryName?.en || category?.categoryName?.bn || "Games";
  }, [category, language]);

  const totalPages = paginationMeta.totalPages || 1;

  const totalGames = paginationMeta.total || 0;

  const goToPage = useCallback(
    (page) => {
      if (
        page < 1 ||
        page > totalPages ||
        page === currentPage ||
        loadingGames
      ) {
        return;
      }

      setCurrentPage(page);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [totalPages, currentPage, loadingGames],
  );

  const handleProviderClick = useCallback(
    (providerId) => {
      if (String(selectedProviderId) === String(providerId)) {
        return;
      }

      setSelectedProviderId(providerId);
      setCurrentPage(1);
      setGamesWithOracle([]);

      setPaginationMeta({
        page: 1,
        limit: GAMES_PER_PAGE,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    },
    [selectedProviderId],
  );

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

  return (
    <div className="min-h-screen pb-20">
      <MarqueeSlider />

      <div className="mx-auto max-w-5xl px-2 pt-3">
        <SwiperContainer>
          <Swiper
            modules={[Autoplay]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            slidesPerView="auto"
            spaceBetween={8}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
          >
            {subOption.map((item) => (
              <SwiperSlide key={item.id}>
                <MenuItem
                  isSelected={String(selectedProviderId) === String(item.id)}
                  onClick={() => handleProviderClick(item.id)}
                >
                  <IconContainer>
                    {typeof item.icon === "string" ? (
                      <img
                        src={item.icon}
                        alt={item.label}
                        loading="lazy"
                        decoding="async"
                        // onError={(event) => {
                        //   event.currentTarget.onerror = null;

                        //   event.currentTarget.src = "/placeholder-game.png";
                        // }}
                      />
                    ) : (
                      item.icon
                    )}
                  </IconContainer>

                  {/* <span className="text-[10px] lg:text-xs font-bold uppercase whitespace-nowrap">
                    {item.label}
                  </span> */}
                </MenuItem>
              </SwiperSlide>
            ))}
          </Swiper>
        </SwiperContainer>

        <div className="mt-4 mb-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-[#10f3c8] uppercase">
            {loading ? "Loading..." : categoryTitle}
          </h1>

          <div className="text-xs font-bold text-[#e0fff7]/80">
            {totalGames} {language === "bn" ? "গেম" : "Games"}
          </div>
        </div>

        {loadingGames ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({
              length: 15,
            }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 sm:h-44 rounded-xl bg-[#003840] animate-pulse border border-[#006165]"
              />
            ))}
          </div>
        ) : gamesWithOracle.length === 0 ? (
          <div className="rounded-xl border border-[#006165] bg-[#003840] py-10 text-center text-[#e0fff7]">
            {language === "bn"
              ? "এই ক্যাটাগরিতে কোনো গেম পাওয়া যায়নি"
              : "No games found in this category"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {gamesWithOracle.map((game, index) => (
                <div
                  key={game._id || game.gameId || index}
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
                    // onError={(event) => {
                    //   event.currentTarget.onerror = null;

                    //   event.currentTarget.src = "/placeholder-game.png";
                    // }}
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

                    <p className="text-white text-[10px] font-semibold text-center line-clamp-2">
                      {getGameName(game)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <PaginationButton
                  disabled={currentPage === 1 || loadingGames}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  {language === "bn" ? "আগে" : "Prev"}
                </PaginationButton>

                {Array.from({
                  length: totalPages,
                }).map((_, idx) => {
                  const page = idx + 1;

                  if (
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - currentPage) > 1
                  ) {
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-2 text-[#e0fff7]/70 font-bold"
                        >
                          ...
                        </span>
                      );
                    }

                    return null;
                  }

                  return (
                    <PaginationButton
                      key={page}
                      active={page === currentPage}
                      disabled={loadingGames}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </PaginationButton>
                  );
                })}

                <PaginationButton
                  disabled={currentPage === totalPages || loadingGames}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  {language === "bn" ? "পরে" : "Next"}
                </PaginationButton>
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

export default SubmenuPage;
