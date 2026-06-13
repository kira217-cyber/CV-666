import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEdit,
  FaFire,
  FaGamepad,
  FaHome,
  FaImage,
  FaSave,
  FaSearch,
  FaSpinner,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaTrophy,
} from "react-icons/fa";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 || "http://localhost:5002";

const ORACLE_BASE = "https://api.oraclegames.live/api";
const ORACLE_PROVIDER_API = "https://api.oraclegames.live/api/providers";
const ORACLE_KEY = import.meta.env.VITE_ORACLE_TOKEN;

const GAMES_PER_PAGE = 50;

const inputClass =
  "w-full rounded-2xl border border-emerald-800/60 bg-black/50 px-4 py-3 text-white placeholder-emerald-300/50 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

const FLAG_FIELDS = [
  {
    key: "isHot",
    label: "Hot",
    icon: <FaFire />,
    activeClass: "bg-red-500 text-white",
    textClass: "text-red-200",
    accent: "accent-red-500",
  },
  {
    key: "isHome",
    label: "Home",
    icon: <FaHome />,
    activeClass: "bg-emerald-500 text-white",
    textClass: "text-emerald-200",
    accent: "accent-emerald-500",
  },
  {
    key: "isJackpot",
    label: "Jackpot",
    icon: <FaTrophy />,
    activeClass: "bg-amber-500 text-black",
    textClass: "text-amber-200",
    accent: "accent-amber-500",
  },
];

const getDefaultFlags = () =>
  FLAG_FIELDS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});

const getImageUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const AddGame = () => {
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [oracleProviders, setOracleProviders] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProviderDbId, setSelectedProviderDbId] = useState("");

  const [providerGames, setProviderGames] = useState([]);
  const [savedGames, setSavedGames] = useState([]);

  const [pageLoading, setPageLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editForm, setEditForm] = useState({
    image: null,
    status: "active",
    ...getDefaultFlags(),
  });

  const [editPreview, setEditPreview] = useState("");
  const [removeOldImage, setRemoveOldImage] = useState(false);
  const [updatingGame, setUpdatingGame] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });

  const selectedProvider = useMemo(
    () => providers.find((p) => p._id === selectedProviderDbId),
    [providers, selectedProviderDbId],
  );

  const providerNameMap = useMemo(() => {
    const map = new Map();

    for (const item of oracleProviders) {
      if (item?.providerCode) {
        map.set(
          String(item.providerCode),
          item?.providerName || item?.providerCode,
        );
      }
    }

    return map;
  }, [oracleProviders]);

  const selectedProviderName = useMemo(() => {
    if (!selectedProvider?.providerId) return "";
    return (
      providerNameMap.get(String(selectedProvider.providerId)) ||
      selectedProvider.providerId
    );
  }, [selectedProvider, providerNameMap]);

  const selectedCategoryName = useMemo(() => {
    const category = categories.find((item) => item._id === selectedCategoryId);
    if (!category) return "";
    return `${category?.categoryName?.en || ""} / ${
      category?.categoryName?.bn || ""
    }`;
  }, [categories, selectedCategoryId]);

  const loadCategories = async () => {
    const { data } = await axios.get(`${API}/api/categories`);
    setCategories(data?.data || []);
  };

  const loadOracleProviders = async () => {
    const { data } = await axios.get(ORACLE_PROVIDER_API, {
      headers: { "x-api-key": ORACLE_KEY },
    });

    setOracleProviders(data?.data || []);
  };

  const loadPageData = async () => {
    try {
      setPageLoading(true);
      await Promise.all([loadCategories(), loadOracleProviders()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load page data");
    } finally {
      setPageLoading(false);
    }
  };

  const loadProvidersByCategory = async (categoryId) => {
    if (!categoryId) {
      setProviders([]);
      setSelectedProviderDbId("");
      return;
    }

    try {
      setLoadingProviders(true);
      const { data } = await axios.get(
        `${API}/api/game-providers?categoryId=${categoryId}`,
      );
      setProviders(data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadSavedGames = async (providerDbId) => {
    if (!providerDbId) {
      setSavedGames([]);
      return;
    }

    try {
      setLoadingSaved(true);
      const { data } = await axios.get(
        `${API}/api/games?providerDbId=${providerDbId}`,
      );
      setSavedGames(data?.data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load saved games",
      );
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadOracleGames = async (providerId) => {
    if (!providerId) {
      setProviderGames([]);
      setCurrentPage(1);
      return;
    }

    try {
      setLoadingGames(true);

      const { data } = await axios.get(
        `${ORACLE_BASE}/providers/${providerId}`,
        {
          headers: { "x-api-key": ORACLE_KEY },
        },
      );

      setProviderGames(data?.games || data?.data?.games || data?.data || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error("Failed to load games from Oracle provider");
      setProviderGames([]);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    loadProvidersByCategory(selectedCategoryId);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadSavedGames(selectedProviderDbId);
  }, [selectedProviderDbId]);

  useEffect(() => {
    if (!selectedProvider?.providerId) {
      setProviderGames([]);
      setCurrentPage(1);
      return;
    }

    loadOracleGames(selectedProvider.providerId);
  }, [selectedProvider]);

  useEffect(() => {
    if (!editForm.image) return;

    const url = URL.createObjectURL(editForm.image);
    setEditPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [editForm.image]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const getGameDisplayName = (game) => {
    return (
      game?.gameName ||
      game?.name ||
      game?.title ||
      game?.game_code ||
      game?.gameCode ||
      "Unnamed Game"
    );
  };

  const getOracleGameId = (game) => {
    return game?._id || game?.id || game?.gameID || game?.gameId || "";
  };

  const getOracleImage = (game) => {
    return (
      game?.image ||
      game?.img ||
      game?.thumbnail ||
      game?.imageUrl ||
      game?.icon ||
      ""
    );
  };

  const filteredGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return providerGames;

    return providerGames.filter((game) => {
      const name = getGameDisplayName(game).toLowerCase();
      const gameCode = String(
        game?.game_code || game?.gameCode || "",
      ).toLowerCase();
      const gameId = String(getOracleGameId(game)).toLowerCase();

      return (
        name.includes(keyword) ||
        gameCode.includes(keyword) ||
        gameId.includes(keyword)
      );
    });
  }, [providerGames, searchText]);

  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;

  const paginatedGames = filteredGames.slice(
    startIndex,
    startIndex + GAMES_PER_PAGE,
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const isGameSelected = (oracleGameId) => {
    return savedGames.some(
      (item) => String(item.gameId) === String(oracleGameId),
    );
  };

  const getSelectedGame = (oracleGameId) => {
    return savedGames.find(
      (item) => String(item.gameId) === String(oracleGameId),
    );
  };

  const selectedCountThisPage = useMemo(() => {
    return paginatedGames.reduce((acc, game) => {
      const gameId = getOracleGameId(game);
      return isGameSelected(gameId) ? acc + 1 : acc;
    }, 0);
  }, [paginatedGames, savedGames]);

  const allSelectedThisPage =
    paginatedGames.length > 0 &&
    selectedCountThisPage === paginatedGames.length;

  const getActiveFlags = (gameDoc) => {
    return FLAG_FIELDS.filter((item) => Boolean(gameDoc?.[item.key]));
  };

  const handleSelectGame = async (game) => {
    const oracleGameId = getOracleGameId(game);

    if (!selectedCategoryId || !selectedProviderDbId) {
      toast.error("Please select category and provider first");
      return;
    }

    if (!oracleGameId) {
      toast.error("Game id not found");
      return;
    }

    const alreadySelected = isGameSelected(oracleGameId);

    try {
      if (alreadySelected) {
        const existingDoc = getSelectedGame(oracleGameId);

        if (!existingDoc?._id) return;

        await axios.delete(`${API}/api/games/${existingDoc._id}`);

        setSavedGames((prev) =>
          prev.filter((item) => item._id !== existingDoc._id),
        );

        toast.success("Game removed successfully");
        return;
      }

      const payload = {
        categoryId: selectedCategoryId,
        providerDbId: selectedProviderDbId,
        gameId: oracleGameId,
        status: "active",
        isHot: false,
        isHome: false,
        isJackpot: false,
      };

      const { data } = await axios.post(`${API}/api/games`, payload);

      setSavedGames((prev) => [data?.data, ...prev]);
      toast.success(data?.message || "Game added successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    }
  };

  const handleSelectAllThisPage = async () => {
    if (bulkLoading || !paginatedGames.length) return;

    if (!selectedCategoryId || !selectedProviderDbId) {
      toast.error("Please select category and provider first");
      return;
    }

    setBulkLoading(true);

    let added = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (const game of paginatedGames) {
        const oracleGameId = getOracleGameId(game);

        if (!oracleGameId) {
          failed++;
          continue;
        }

        if (isGameSelected(oracleGameId)) {
          skipped++;
          continue;
        }

        try {
          const { data } = await axios.post(`${API}/api/games`, {
            categoryId: selectedCategoryId,
            providerDbId: selectedProviderDbId,
            gameId: oracleGameId,
            status: "active",
            isHot: false,
            isHome: false,
            isJackpot: false,
          });

          setSavedGames((prev) => [data?.data, ...prev]);
          added++;
        } catch (err) {
          failed++;
        }
      }

      if (added) toast.success(`${added} game selected successfully`);
      if (skipped) toast.info(`${skipped} game already selected`);
      if (failed) toast.error(`${failed} game failed`);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRemoveSelectedAllThisPage = async () => {
    if (bulkLoading || !paginatedGames.length) return;

    setBulkLoading(true);

    let removed = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (const game of paginatedGames) {
        const oracleGameId = getOracleGameId(game);
        const existingDoc = getSelectedGame(oracleGameId);

        if (!existingDoc?._id) {
          skipped++;
          continue;
        }

        try {
          await axios.delete(`${API}/api/games/${existingDoc._id}`);

          setSavedGames((prev) =>
            prev.filter((item) => item._id !== existingDoc._id),
          );

          removed++;
        } catch (err) {
          failed++;
        }
      }

      if (removed) toast.success(`${removed} game removed successfully`);
      if (skipped) toast.info(`${skipped} game not selected`);
      if (failed) toast.error(`${failed} game remove failed`);
    } finally {
      setBulkLoading(false);
    }
  };

  const openEditModal = (gameDoc) => {
    setEditingGame(gameDoc);

    const flags = FLAG_FIELDS.reduce((acc, item) => {
      acc[item.key] = Boolean(gameDoc?.[item.key]);
      return acc;
    }, {});

    setEditForm({
      image: null,
      status: gameDoc?.status || "active",
      ...flags,
    });

    setRemoveOldImage(false);
    setEditPreview(getImageUrl(gameDoc?.image || ""));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingGame(null);
    setEditModalOpen(false);

    setEditForm({
      image: null,
      status: "active",
      ...getDefaultFlags(),
    });

    setEditPreview("");
    setRemoveOldImage(false);
    setUpdatingGame(false);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      toast.error("Only jpeg, jpg, png, webp image allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      image: file,
    }));

    setRemoveOldImage(false);
  };

  const handleUpdateGame = async (e) => {
    e.preventDefault();

    if (!editingGame?._id) return;

    try {
      setUpdatingGame(true);

      const fd = new FormData();
      fd.append("status", editForm.status);
      fd.append("removeOldImage", removeOldImage ? "true" : "false");

      FLAG_FIELDS.forEach((item) => {
        fd.append(item.key, String(Boolean(editForm[item.key])));
      });

      if (editForm.image instanceof File) {
        fd.append("image", editForm.image);
      }

      const { data } = await axios.put(
        `${API}/api/games/${editingGame._id}`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setSavedGames((prev) =>
        prev.map((item) => (item._id === editingGame._id ? data?.data : item)),
      );

      toast.success(data?.message || "Game updated successfully");
      closeEditModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update game");
    } finally {
      setUpdatingGame(false);
    }
  };

  const openDeleteModal = (gameDoc, oracleGame) => {
    setDeleteModal({
      open: true,
      id: gameDoc._id,
      title: getGameDisplayName(oracleGame),
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      id: null,
      title: "",
    });
  };

  const confirmDelete = async () => {
    try {
      const { data } = await axios.delete(`${API}/api/games/${deleteModal.id}`);

      toast.success(data?.message || "Game deleted successfully");

      setSavedGames((prev) =>
        prev.filter((item) => item._id !== deleteModal.id),
      );

      if (editingGame?._id === deleteModal.id) {
        closeEditModal();
      }

      closeDeleteModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete game");
    }
  };

  const Pagination = () => {
    if (totalPages <= 1 || !selectedProviderDbId) return null;

    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="cursor-pointer rounded-xl border border-emerald-700/50 bg-black/50 px-5 py-2.5 font-bold text-emerald-100 transition-all hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="rounded-xl border border-emerald-700/50 bg-black/40 px-4 py-2 text-sm font-bold text-emerald-100">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="cursor-pointer rounded-xl border border-emerald-700/50 bg-black/50 px-5 py-2.5 font-bold text-emerald-100 transition-all hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>

        <div className="text-sm text-emerald-200/75">
          Selected This Page:{" "}
          <span className="font-black text-emerald-300">
            {selectedCountThisPage}/{paginatedGames.length}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />

      <div className="min-h-screen px-4 md:px-8 pb-10 text-emerald-50">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-green-950 via-emerald-950 to-black shadow-2xl shadow-emerald-950/50">
            <div className="border-b border-emerald-800/50 bg-gradient-to-r from-emerald-900/70 via-green-900/60 to-black px-5 py-5 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-900/60">
                    <FaGamepad className="text-2xl text-white" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
                      Add Games
                    </h1>
                    <p className="mt-1 text-sm text-emerald-200/80">
                      Category → Provider select করে Oracle games add/manage
                      করুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadPageData}
                  disabled={pageLoading}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-600/50 bg-emerald-800/60 px-5 py-3 font-bold text-white transition-all hover:bg-emerald-700/70 disabled:opacity-60"
                >
                  <FaSyncAlt className={pageLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="space-y-5 border-b border-emerald-800/50 p-5 md:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-emerald-200">
                    Select Category
                  </label>

                  <select
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedProviderDbId("");
                      setProviderGames([]);
                      setSavedGames([]);
                      setCurrentPage(1);
                      setSearchText("");
                    }}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option className="bg-black" value="">
                      Choose category...
                    </option>

                    {categories.map((cat) => (
                      <option
                        className="bg-black"
                        key={cat._id}
                        value={cat._id}
                      >
                        {cat?.categoryName?.en} / {cat?.categoryName?.bn}
                      </option>
                    ))}
                  </select>

                  {selectedCategoryName && (
                    <p className="mt-2 text-xs text-emerald-200/75">
                      Selected Category:{" "}
                      <span className="font-bold text-emerald-300">
                        {selectedCategoryName}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-emerald-200">
                    Select Provider
                  </label>

                  <select
                    value={selectedProviderDbId}
                    onChange={(e) => {
                      setSelectedProviderDbId(e.target.value);
                      setProviderGames([]);
                      setSavedGames([]);
                      setCurrentPage(1);
                      setSearchText("");
                    }}
                    disabled={!selectedCategoryId || loadingProviders}
                    className={`${inputClass} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option className="bg-black" value="">
                      {loadingProviders
                        ? "Loading providers..."
                        : "Choose provider..."}
                    </option>

                    {providers.map((provider) => (
                      <option
                        className="bg-black"
                        key={provider._id}
                        value={provider._id}
                      >
                        {providerNameMap.get(String(provider.providerId)) ||
                          provider.providerId}{" "}
                        ({provider.providerId})
                      </option>
                    ))}
                  </select>

                  {selectedProvider && (
                    <p className="mt-2 text-xs text-emerald-200/75">
                      Selected Provider:{" "}
                      <span className="font-bold text-emerald-300">
                        {selectedProviderName}
                      </span>{" "}
                      • Code:{" "}
                      <span className="font-mono text-white">
                        {selectedProvider.providerId}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {selectedProviderDbId && (
                <>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                      <label className="mb-2 block text-sm font-bold text-emerald-200">
                        Search Game
                      </label>

                      <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" />

                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Search by game name, code, or id..."
                          className={`${inputClass} pl-12 cursor-text`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 lg:col-span-2">
                      <button
                        type="button"
                        onClick={handleSelectAllThisPage}
                        disabled={
                          bulkLoading ||
                          allSelectedThisPage ||
                          !paginatedGames.length
                        }
                        className="cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-700 to-green-700 px-5 py-3 font-black text-white shadow-lg shadow-emerald-950/60 transition-all hover:from-emerald-600 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {bulkLoading ? "Working..." : "Select All Game"}
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveSelectedAllThisPage}
                        disabled={bulkLoading || selectedCountThisPage === 0}
                        className="cursor-pointer rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-black text-red-200 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {bulkLoading ? "Working..." : "Remove Selected All"}
                      </button>
                    </div>
                  </div>

                  <Pagination />
                </>
              )}
            </div>

            <div className="p-5 md:p-8">
              {!selectedProviderDbId ? (
                <div className="rounded-3xl border border-emerald-800/50 bg-black/30 py-12 text-center text-emerald-100">
                  Select category and provider first
                </div>
              ) : loadingGames ? (
                <div className="flex items-center justify-center gap-3 rounded-3xl border border-emerald-800/50 bg-black/30 py-12 text-center text-emerald-100">
                  <FaSpinner className="animate-spin text-2xl" />
                  Loading games from provider...
                </div>
              ) : loadingSaved ? (
                <div className="flex items-center justify-center gap-3 rounded-3xl border border-emerald-800/50 bg-black/30 py-12 text-center text-emerald-100">
                  <FaSpinner className="animate-spin text-2xl" />
                  Loading saved games...
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="rounded-3xl border border-emerald-800/50 bg-black/30 py-12 text-center text-emerald-100">
                  {searchText
                    ? "No matching games found"
                    : "No games found for this provider"}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {paginatedGames.map((game) => {
                    const oracleGameId = getOracleGameId(game);
                    const selected = isGameSelected(oracleGameId);
                    const selectedDoc = getSelectedGame(oracleGameId);
                    const displayName = getGameDisplayName(game);
                    const activeFlags = getActiveFlags(selectedDoc);

                    const imageToShow =
                      selected && selectedDoc?.image
                        ? getImageUrl(selectedDoc.image)
                        : getOracleImage(game);

                    return (
                      <div
                        key={oracleGameId}
                        className={`overflow-hidden rounded-3xl border bg-gradient-to-br from-black via-emerald-950/50 to-black shadow-xl shadow-emerald-950/40 transition-all ${
                          selected
                            ? "border-emerald-400 ring-2 ring-emerald-400/30"
                            : "border-emerald-800/50"
                        }`}
                      >
                        <div className="relative">
                          {imageToShow ? (
                            <img
                              src={imageToShow}
                              alt={displayName}
                              className="h-48 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-48 w-full items-center justify-center bg-black/45">
                              <FaImage className="text-5xl text-emerald-300/80" />
                            </div>
                          )}

                          {selected && (
                            <div className="absolute right-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-lg">
                              SELECTED
                            </div>
                          )}

                          {activeFlags.length > 0 && (
                            <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
                              {activeFlags.map((flag) => (
                                <span
                                  key={flag.key}
                                  className={`rounded-full px-3 py-1 text-xs font-black shadow-lg ${flag.activeClass}`}
                                >
                                  {flag.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <h3 className="line-clamp-2 text-lg font-black text-white">
                            {displayName}
                          </h3>

                          <div className="mt-2 space-y-1 text-xs text-emerald-200/70">
                            <div className="break-all">
                              gameId: {oracleGameId}
                            </div>

                            {(game?.game_code || game?.gameCode) && (
                              <div className="break-all">
                                game_code: {game?.game_code || game?.gameCode}
                              </div>
                            )}

                            {selected && (
                              <>
                                <div>Status: {selectedDoc?.status}</div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {activeFlags.length > 0 ? (
                                    activeFlags.map((flag) => (
                                      <span
                                        key={flag.key}
                                        className="rounded-full border border-emerald-700/50 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-emerald-100"
                                      >
                                        {flag.label}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-emerald-200/50">
                                      No flags selected
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <label className="mt-4 flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleSelectGame(game)}
                              className="h-5 w-5 cursor-pointer accent-emerald-500"
                            />

                            <span className="font-bold text-emerald-100">
                              {selected ? "Selected" : "Add to Platform"}
                            </span>
                          </label>

                          {selected && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => openEditModal(selectedDoc)}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600/20 px-4 py-3 font-black text-blue-200 transition-all hover:bg-blue-600/30 border border-blue-400/30"
                              >
                                <FaEdit />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteModal(selectedDoc, game)
                                }
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-black text-red-200 transition-all hover:bg-red-500/20"
                              >
                                <FaTrash />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Pagination />
          </div>
        </div>

        {editModalOpen && editingGame && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-green-950 via-emerald-950 to-black p-6 shadow-2xl shadow-emerald-950/70">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-white">Edit Game</h3>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200 transition-all hover:bg-red-500/20 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateGame} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-emerald-200">
                    Replace Image
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-700/60 bg-black/40 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-950/30">
                    <FaImage className="mb-3 text-4xl text-emerald-300" />

                    <span className="text-base font-bold text-white">
                      Click to upload new image
                    </span>

                    <span className="mt-1 text-sm text-emerald-200/65">
                      jpeg, jpg, png, webp | max 5MB
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleEditImageChange}
                      className="hidden"
                    />
                  </label>

                  {editPreview && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-800/60 bg-black/40">
                      <img
                        src={editPreview}
                        alt="Edit Preview"
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  )}

                  {(editPreview || editingGame?.image) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm((prev) => ({ ...prev, image: null }));
                        setEditPreview("");
                        setRemoveOldImage(true);
                      }}
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-5 py-2.5 font-bold text-yellow-200 transition-all hover:bg-yellow-500/20"
                    >
                      <FaTimes />
                      Remove Old Image
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-emerald-200">
                    Status
                  </label>

                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option className="bg-black" value="active">
                      Active
                    </option>
                    <option className="bg-black" value="inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-bold text-emerald-200">
                    Game Flags
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {FLAG_FIELDS.map((flag) => (
                      <label
                        key={flag.key}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-800/60 bg-black/40 px-4 py-3 transition-all hover:bg-emerald-950/30"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(editForm[flag.key])}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              [flag.key]: e.target.checked,
                            }))
                          }
                          className={`h-5 w-5 cursor-pointer ${flag.accent}`}
                        />

                        <span
                          className={`inline-flex items-center gap-2 font-bold ${flag.textClass}`}
                        >
                          {flag.icon}
                          Mark as {flag.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={updatingGame}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-green-700 px-6 py-3 font-black text-white shadow-lg shadow-emerald-950/60 transition-all hover:from-emerald-600 hover:to-green-600 disabled:opacity-60"
                  >
                    {updatingGame ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}
                    {updatingGame ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-3 font-bold text-red-200 transition-all hover:bg-red-500/20"
                  >
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteModal.open && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-red-400/30 bg-gradient-to-br from-black via-red-950/20 to-black p-6 shadow-2xl">
              <h3 className="text-2xl font-black text-white">Confirm Delete</h3>

              <p className="mt-3 text-red-100/85">
                তুমি কি নিশ্চিত{" "}
                <span className="font-bold text-white">
                  {deleteModal.title}
                </span>{" "}
                game delete করতে চাও?
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black text-white transition-all hover:bg-red-500"
                >
                  <FaTrash />
                  Yes, Delete
                </button>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-emerald-700/50 bg-black/45 px-5 py-3 font-bold text-white transition-all hover:bg-emerald-950/40"
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AddGame;
