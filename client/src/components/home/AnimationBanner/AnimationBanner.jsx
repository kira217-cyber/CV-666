import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { baseURL } from "@/utils/baseURL";
import { Link, useNavigate } from "react-router-dom";
import Modal from "@/components/home/modal/Modal";
import Login from "@/components/shared/login/Login";
import RegistrationModal from "@/components/shared/login/RegistrationModal";
import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 || import.meta.env.VITE_API_URL;

const JACKPOT_GAME_LIMIT = 50;

const DEFAULT_BANNER_DATA = {
  titleBD: "জ্যাকপট",
  titleEN: "JACKPOT",
  titleColor: "#FFFF00",
  bannerBackgroundColor: "#012632",
  numberBackgroundColor: "#FFFFFF",
  numberColor: "#000000",
};

const REEL_DIGITS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];

const getUploadImage = (path = "") => {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const getGameName = (game) => {
  return (
    game?.gameName || game?.oracle?.name || game?.name || game?.gameId || "game"
  );
};

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

const generateRandomNumber = () => {
  return Math.floor(100000000 + Math.random() * 900000000);
};

const formatCounter = (num) => {
  const str = String(num).padStart(9, "0").slice(-9);

  return [
    "৳",
    ...str.slice(0, 3).split(""),
    ",",
    ...str.slice(3, 6).split(""),
    ",",
    ...str.slice(6, 9).split(""),
  ];
};

export default function AnimationBanner() {
  const navigate = useNavigate();
  const reelRefs = useRef([]);

  const animationStartTimeoutRef = useRef(null);
  const animationRestartTimeoutRef = useRef(null);

  const [gamesData, setGamesData] = useState([]);
  const [counter, setCounter] = useState(123456789);

  const [bannerData, setBannerData] = useState(DEFAULT_BANNER_DATA);

  const [showLoginModal, setShowLoginModal] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const { language, user } = useContext(AuthContext);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBannerData = async () => {
      try {
        const response = await fetch(`${baseURL}/animation-banner`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch AnimationBanner data");
        }

        const data = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        setBannerData({
          titleBD: data?.titleBD || DEFAULT_BANNER_DATA.titleBD,

          titleEN: data?.titleEN || DEFAULT_BANNER_DATA.titleEN,

          titleColor: data?.titleColor || DEFAULT_BANNER_DATA.titleColor,

          bannerBackgroundColor:
            data?.bannerBackgroundColor ||
            DEFAULT_BANNER_DATA.bannerBackgroundColor,

          numberBackgroundColor:
            data?.numberBackgroundColor ||
            DEFAULT_BANNER_DATA.numberBackgroundColor,

          numberColor: data?.numberColor || DEFAULT_BANNER_DATA.numberColor,
        });
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) {
          return;
        }

        console.error(
          "Error fetching AnimationBanner:",
          error?.message || error,
        );

        setBannerData(DEFAULT_BANNER_DATA);
      }
    };

    fetchBannerData();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchJackpotGames = async () => {
      try {
        const { data } = await axios.get(`${API}/api/public-games`, {
          params: {
            status: "active",
            isJackpot: true,
            page: 1,
            limit: JACKPOT_GAME_LIMIT,
          },
          signal: controller.signal,
        });

        const docs = extractGames(data);

        if (!controller.signal.aborted) {
          setGamesData(docs);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
          return;
        }

        console.error("Failed to load jackpot games:", error?.message || error);

        setGamesData([]);
      }
    };

    fetchJackpotGames();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const digitCount = 9;

    reelRefs.current = reelRefs.current.slice(0, digitCount);

    const clearAnimationTimers = () => {
      if (animationStartTimeoutRef.current) {
        window.clearTimeout(animationStartTimeoutRef.current);

        animationStartTimeoutRef.current = null;
      }

      if (animationRestartTimeoutRef.current) {
        window.clearTimeout(animationRestartTimeoutRef.current);

        animationRestartTimeoutRef.current = null;
      }
    };

    const startReelAnimation = () => {
      reelRefs.current.forEach((reel, index) => {
        if (!reel) return;

        reel.style.animation = `scroll${
          index % 2 === 1 ? "Down" : "Up"
        } 0.5s linear infinite`;
      });

      animationStartTimeoutRef.current = window.setTimeout(() => {
        const digits = String(counter).padStart(9, "0").slice(-9).split("");

        reelRefs.current.forEach((reel, index) => {
          if (!reel) return;

          const targetDigit = Number.parseInt(digits[index] || "0", 10);

          const offset = (targetDigit * 10) % 100;

          reel.style.animation = "slowDown 3s ease-out forwards";

          reel.style.setProperty("--stop-position", `-${offset}%`);
        });

        animationRestartTimeoutRef.current = window.setTimeout(() => {
          setCounter(generateRandomNumber());
        }, 5000);
      }, 1000);
    };

    clearAnimationTimers();
    startReelAnimation();

    return () => {
      clearAnimationTimers();

      reelRefs.current.forEach((reel) => {
        if (reel) {
          reel.style.animation = "";
        }
      });
    };
  }, [counter]);

  const duplicatedGames = useMemo(() => {
    if (!gamesData.length) return [];

    return [...gamesData, ...gamesData];
  }, [gamesData]);

  const formattedCounter = useMemo(() => {
    return formatCounter(counter);
  }, [counter]);

  const displayTitle = useMemo(() => {
    return language === "bn" ? bannerData.titleBD : bannerData.titleEN;
  }, [language, bannerData.titleBD, bannerData.titleEN]);

  const handlePlayGame = useCallback(
    (game) => {
      if (!game) return;

      if (!user) {
        setShowLoginModal(false);
        setShowRegisterModal(true);
        return;
      }

      navigate(`/liveGame/${game.gameId}`);
    },
    [navigate, user],
  );

  return (
    <div
      className="h-full w-full max-w-5xl mx-auto rounded-xl overflow-hidden flex flex-col md:grid md:grid-cols-12 banner-container"
      style={{
        backgroundColor: bannerData.bannerBackgroundColor,
      }}
    >
      <div
        className="jackpot-section w-full md:col-span-6 grid grid-cols-12"
        style={{
          backgroundImage:
            "url('https://www.tk999.org/img/jp-bg.bda60d56.png')",
          backgroundSize: "auto 200px",
          backgroundPosition: "left top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <p
          className="col-span-12 text-right text-5xl md:text-6xl flex items-end justify-end h-full mr-8"
          style={{
            color: bannerData.titleColor,
            fontFamily:
              language === "bn"
                ? "'Kalpurush', Arial, sans-serif"
                : "system-ui, sans-serif",
          }}
        >
          {displayTitle}
        </p>

        <div className="col-span-12 flex justify-center items-center h-full relative overflow-hidden">
          <div className="odometer flex justify-center items-center gap-[8px] p-[10px_14px] rounded-[14px] bg-[#0b1222] shadow-[0_0_25px_rgba(242,15,91,0.25),0_0_40px_rgba(255,180,0,0.15)]">
            {formattedCounter.map((text, index) => {
              const digitIndex = Math.floor((index - 1) / 2);

              return (
                <span
                  key={`${text}-${index}`}
                  className="inline-flex items-center"
                >
                  {text === "৳" || text === "," ? (
                    <span
                      className={`static font-[800] px-[2px] text-[clamp(1.5rem,3vw,3.5rem)] ${
                        text === "৳" ? "mr-[4px]" : ""
                      }`}
                      style={{
                        color:
                          text === "৳"
                            ? bannerData.numberColor
                            : bannerData.titleColor,
                      }}
                    >
                      {text === "," ? ",\u00A0" : text}
                    </span>
                  ) : (
                    <div
                      className={`slot ${index % 2 === 1 ? "down" : ""}`}
                      style={{
                        width: "clamp(21px, 3.72vw, 39.68px)",
                        height: "clamp(34px, 6vw, 64px)",
                        borderRadius: "5px",
                        background: bannerData.numberBackgroundColor,
                      }}
                    >
                      <div
                        className="reel flex flex-col"
                        ref={(element) => {
                          reelRefs.current[digitIndex] = element;
                        }}
                        style={{
                          fontSize: "clamp(34px, 6vw, 64px)",
                          color: bannerData.numberColor,
                        }}
                      >
                        {REEL_DIGITS.map((digit, digitIndexValue) => (
                          <span
                            key={`${digit}-${digitIndexValue}`}
                            className="flex items-center justify-center"
                            style={{
                              height: "clamp(34px, 6vw, 64px)",
                            }}
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </span>
              );
            })}
          </div>
        </div>
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

      <div className="games-section w-full md:col-span-6 p-1 overflow-hidden">
        <div className="slider-container h-full">
          <div className="slider-track flex">
            {duplicatedGames.map((game, index) => (
              <div
                key={`${game?._id || game?.gameId || "game"}-${index}`}
                className="relative group overflow-hidden rounded-lg shadow-md w-[130px] h-[176px] flex-shrink-0 mx-1 cursor-pointer"
                onClick={() => handlePlayGame(game)}
              >
                <img
                  src={getGameImage(game)}
                  alt={getGameName(game)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-110 group-hover:blur-[2px]"
                  onError={(event) => {
                    event.currentTarget.onerror = null;

                    event.currentTarget.src = "/placeholder-game.png";
                  }}
                />

                {game?.showHeart && (
                  <Link
                    to={game?.heartLink || "#"}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="absolute top-1 right-1 bg-[#ffffff45] bg-opacity-80 rounded-full p-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                  </Link>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 px-1 uppercase">
                  <div className="py-0.5 px-1 text-[8px] font-bold text-[#b64100] bg-[#ffd900] rounded-md mb-1 transform scale-50 group-hover:scale-100 group-hover:py-1 group-hover:px-2 group-hover:text-[10px] transition-all duration-700 ease-in-out">
                    {game?.playText ||
                      (language === "bn" ? "এখন খেলুন" : "PLAY NOW")}
                  </div>

                  {game?.freeTrialLink && (
                    <Link
                      to={game.freeTrialLink}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="py-0.5 px-1 text-[8px] font-bold text-[#b64100] bg-[#ffd900] rounded-md mb-1 transform scale-50 group-hover:scale-100 group-hover:py-1 group-hover:px-2 group-hover:text-[10px] transition-all duration-700 ease-in-out">
                        {game?.trialText ||
                          (language === "bn" ? "ফ্রি ট্রায়াল" : "Free Trial")}
                      </div>
                    </Link>
                  )}

                  <p className="text-white text-[10px] font-semibold text-center line-clamp-2">
                    {getGameName(game)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        :root {
          --digit-size: clamp(34px, 6vw, 64px);
          --gap: 8px;
        }

        .banner-container {
          display: flex;
          flex-direction: column;
        }

        .jackpot-section,
        .games-section {
          height: 180px;
        }

        .slider-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .slider-track {
          display: flex;
          animation: slideRightToLeft 5s linear infinite;
          will-change: transform;
        }

        .slider-container:hover .slider-track {
          animation-play-state: paused;
        }

        .odometer {
          font-family: "Roboto Mono", monospace;
        }

        .slot {
          width: calc(var(--digit-size) * 0.62);
          height: var(--digit-size);
          overflow: hidden;
          border-radius: 5px;
          background: #ffffff;
          position: relative;
        }

        .slot::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 38%;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(0, 0, 0, 0.25)
          );
        }

        .reel {
          display: flex;
          flex-direction: column;
          font: 700 var(--digit-size) / 1
            "Roboto Mono", monospace;
          text-shadow: 0 1px 0
            rgba(0, 0, 0, 0.5);
          will-change: transform;
        }

        .slot.down .reel {
          animation-direction: reverse;
        }

        .reel span {
          display: grid;
          place-items: center;
          height: var(--digit-size);
        }

        .static {
          font-family: Inter, system-ui, sans-serif;
        }

        @keyframes slideRightToLeft {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scrollUp {
          from {
            transform: translateY(0%);
          }

          to {
            transform: translateY(-50%);
          }
        }

        @keyframes scrollDown {
          from {
            transform: translateY(-50%);
          }

          to {
            transform: translateY(0%);
          }
        }

        @keyframes slowDown {
          0% {
            transform: translateY(0%);
            animation-timing-function: linear;
          }

          100% {
            transform: translateY(
              var(--stop-position)
            );
            animation-timing-function: ease-out;
          }
        }

        @media (min-width: 768px) {
          .banner-container {
            display: grid;
            grid-template-columns: repeat(
              12,
              minmax(0, 1fr)
            );
            height: 180px;
          }

          .jackpot-section,
          .games-section {
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
}
