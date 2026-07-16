import { BsFire } from "react-icons/bs";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import Button from "./Button";

import { useContext, useEffect, useMemo, useState } from "react";

import { AuthContext } from "@/Context/AuthContext";
import axios from "axios";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5002";

/* ======================================================
   CATEGORY CACHE
====================================================== */

const CATEGORY_CACHE_DURATION = 5 * 60 * 1000;

let categoryCache = {
  data: null,
  expiresAt: 0,
};

let categoryPendingRequest = null;

/* ======================================================
   HELPERS
====================================================== */

const getImageUrl = (path = "") => {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const sortCategories = (categories = []) => {
  if (!Array.isArray(categories)) return [];

  return [...categories].sort((a, b) => {
    const orderA = Number(a?.order ?? 0);
    const orderB = Number(b?.order ?? 0);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return (
      new Date(a?.createdAt || 0).getTime() -
      new Date(b?.createdAt || 0).getTime()
    );
  });
};

const fetchActiveCategories = async (signal) => {
  const now = Date.now();

  if (Array.isArray(categoryCache.data) && categoryCache.expiresAt > now) {
    return categoryCache.data;
  }

  /*
   * একই সময়ে Menu component একাধিকবার mount হলে
   * duplicate API request হবে না।
   */
  if (categoryPendingRequest) {
    return categoryPendingRequest;
  }

  categoryPendingRequest = axios
    .get(`${API}/api/public-games/categories/active`, {
      signal,
    })
    .then(({ data }) => {
      const categories = sortCategories(
        Array.isArray(data?.data) ? data.data : [],
      );

      categoryCache = {
        data: categories,
        expiresAt: Date.now() + CATEGORY_CACHE_DURATION,
      };

      return categories;
    })
    .finally(() => {
      categoryPendingRequest = null;
    });

  return categoryPendingRequest;
};

const translations = {
  bn: {
    "HOT GAMES": "গরম খেলা",
  },

  en: {
    "HOT GAMES": "Hot Game",
  },
};

/* ======================================================
   STYLED COMPONENTS
====================================================== */

const MenuContainer = styled.div`
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  overflow-x: auto;

  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const MenuList = styled.div`
  display: flex;
  gap: 0.5rem;
  min-width: max-content;

  @media (min-width: 1024px) {
    gap: 0.5rem;
  }
`;

const MenuItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
  height: 45px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  color: rgb(224, 255, 247);
  background: #013941;
  border-radius: 10px;
  border: 0.8px solid #026e7aff;
  box-shadow: rgba(0, 38, 40, 1) 0px 2px 0px 0px;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #028e9bff;
    transform: translateY(-2px);
  }

  @media (min-width: 1024px) {
    flex-direction: column;
    height: 75px;
    width: 100px;
    gap: 4px;
    padding: 10px 0;
    font-size: 13px;
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  img,
  svg {
    width: 18px;
    height: 18px;
  }

  img {
    object-fit: contain;
  }

  @media (min-width: 1024px) {
    img,
    svg {
      width: 26px;
      height: 26px;
    }
  }
`;

const Label = styled.p`
  white-space: nowrap;
  color: rgb(224, 255, 247);
  font-weight: bold;

  @media (min-width: 1024px) {
    font-size: 13px;
  }
`;

const ErrorContainer = styled.div``;

const ErrorMessage = styled.div`
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #f87171;
`;

/* ======================================================
   COMPONENT
====================================================== */

const Menu = ({ homeGameMenu }) => {
  const { language } = useContext(AuthContext);

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const [categories, setCategories] = useState(() => {
    if (
      Array.isArray(categoryCache.data) &&
      categoryCache.expiresAt > Date.now()
    ) {
      return categoryCache.data;
    }

    return [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    return !(
      Array.isArray(categoryCache.data) && categoryCache.expiresAt > Date.now()
    );
  });

  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* ======================================================
     RESPONSIVE DETECTION
  ====================================================== */

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleChange = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  /* ======================================================
     FETCH CATEGORIES
  ====================================================== */

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        setErrorMessage("");

        const categoryData = await fetchActiveCategories(controller.signal);

        if (!controller.signal.aborted) {
          setCategories(categoryData);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || axios.isCancel(error)) {
          return;
        }

        if (!controller.signal.aborted) {
          setCategories([]);
          setIsError(true);

          setErrorMessage(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to load categories",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  /* ======================================================
     MENU ITEMS
  ====================================================== */

  const menuItems = useMemo(() => {
    const hotGameItem = {
      id: "hot-games",
      label: "HOT GAMES",
      icon: <BsFire />,
      path: "/hot-games",
    };

    const dynamicMenuItems = categories.map((category) => {
      const categoryLabel =
        language === "bn"
          ? category?.categoryName?.bn ||
            category?.categoryName?.en ||
            "Category"
          : category?.categoryName?.en ||
            category?.categoryName?.bn ||
            "Category";

      return {
        id: category._id,
        label: categoryLabel,

        icon: category?.iconUrl ? getImageUrl(category.iconUrl) : <BsFire />,

        path: `/category/${category._id}`,
      };
    });

    return [hotGameItem, ...dynamicMenuItems];
  }, [categories, language]);

  const menuContainerStyle = useMemo(
    () => ({
      marginTop: homeGameMenu?.gameBoxMarginTop
        ? `${homeGameMenu.gameBoxMarginTop}px`
        : "0px",

      marginBottom: homeGameMenu?.gameNavMenuMarginBottom
        ? `${homeGameMenu.gameNavMenuMarginBottom}px`
        : "0px",
    }),
    [homeGameMenu?.gameBoxMarginTop, homeGameMenu?.gameNavMenuMarginBottom],
  );

  const getLabel = (key) => {
    return translations?.[language]?.[key] || key;
  };

  /* ======================================================
     LOADING
  ====================================================== */

  if (isLoading) {
    return (
      <>
        <Button />

        <div className="pb-2 lg:pb-4 w-full max-w-5xl mx-auto rounded-xl overflow-hidden">
          <MenuContainer>
            <MenuList>
              {Array.from({
                length: 8,
              }).map((_, idx) => (
                <div
                  key={`menu-skeleton-${idx}`}
                  className="flex flex-row lg:flex-col items-center gap-2 justify-center h-[45px] lg:h-[75px] w-[120px] lg:w-[100px] px-4 lg:px-0"
                >
                  <Skeleton
                    circle
                    width={isDesktop ? 36 : 26}
                    height={isDesktop ? 36 : 26}
                    baseColor="#013941"
                    highlightColor="#015b63"
                  />

                  <Skeleton
                    width={isDesktop ? 60 : 90}
                    height={12}
                    baseColor="#013941"
                    highlightColor="#015b63"
                  />
                </div>
              ))}
            </MenuList>
          </MenuContainer>
        </div>
      </>
    );
  }

  /* ======================================================
     ERROR
  ====================================================== */

  if (isError) {
    return (
      <ErrorContainer>
        <ErrorMessage>{errorMessage}</ErrorMessage>
      </ErrorContainer>
    );
  }

  /* ======================================================
     UI
  ====================================================== */

  return (
    <>
      <Button />

      <div className="pb-2 lg:pb-4 w-full max-w-5xl mx-auto rounded-xl overflow-hidden">
        <MenuContainer style={menuContainerStyle}>
          <MenuList>
            {menuItems.map((item) => (
              <Link key={item.id} to={item.path}>
                <MenuItem>
                  <IconContainer>
                    {typeof item.icon === "string" ? (
                      <img
                        src={item.icon}
                        alt={item.label}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.onerror = null;

                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      item.icon
                    )}
                  </IconContainer>

                  <Label>{getLabel(item.label)}</Label>
                </MenuItem>
              </Link>
            ))}
          </MenuList>
        </MenuContainer>
      </div>
    </>
  );
};

export default Menu;
