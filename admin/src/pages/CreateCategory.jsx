import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEdit,
  FaImage,
  FaPlusCircle,
  FaSave,
  FaSpinner,
  FaSyncAlt,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 || "http://localhost:5002";

const getImageUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const defaultForm = {
  categoryNameBn: "",
  categoryNameEn: "",
  isActive: true,
  icon: null,
};

const CreateCategory = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [preview, setPreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const fetchCategories = async () => {
    try {
      setFetching(true);
      const { data } = await axios.get(`${API}/api/categories`);
      setCategories(data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Category fetch failed");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setPreview("");
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Only jpeg, jpg, png, webp image allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setForm((prev) => ({ ...prev, icon: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setForm({
      categoryNameBn: category?.categoryName?.bn || "",
      categoryNameEn: category?.categoryName?.en || "",
      isActive: Boolean(category?.isActive),
      icon: null,
    });
    setPreview(getImageUrl(category?.iconUrl));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.categoryNameBn.trim()) {
      toast.error("Category Name Bangla required");
      return;
    }

    if (!form.categoryNameEn.trim()) {
      toast.error("Category Name English required");
      return;
    }

    if (!isEditing && !form.icon) {
      toast.error("Category icon required");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("categoryNameBn", form.categoryNameBn.trim());
      formData.append("categoryNameEn", form.categoryNameEn.trim());
      formData.append("isActive", String(form.isActive));

      if (form.icon) {
        formData.append("icon", form.icon);
      }

      if (isEditing) {
        await axios.put(`${API}/api/categories/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category updated successfully");
      } else {
        await axios.post(`${API}/api/categories`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Category created successfully");
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this category?");
    if (!ok) return;

    try {
      setDeletingId(id);
      await axios.delete(`${API}/api/categories/${id}`);
      toast.success("Category deleted successfully");

      if (editingId === id) resetForm();

      fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
      <div className="min-h-screen px-4 md:px-8 pb-10 text-emerald-50">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-green-950 via-emerald-950 to-black p-5 md:p-8 shadow-2xl shadow-emerald-950/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
              <div>
                <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3">
                  <FaPlusCircle className="text-emerald-300" />
                  Create Category
                </h1>
                <p className="text-emerald-200/80 mt-2">
                  Add, update and delete game categories.
                </p>
              </div>

              <button
                onClick={fetchCategories}
                disabled={fetching}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-800/60 hover:bg-emerald-700/70 border border-emerald-600/50 text-white font-semibold transition-all cursor-pointer disabled:opacity-60"
              >
                <FaSyncAlt className={fetching ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-emerald-200 mb-2">
                    Category Name Bangla
                  </label>
                  <input
                    type="text"
                    name="categoryNameBn"
                    value={form.categoryNameBn}
                    onChange={handleChange}
                    placeholder="যেমন: স্লট গেম"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-emerald-800/60 text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 cursor-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-emerald-200 mb-2">
                    Category Name English
                  </label>
                  <input
                    type="text"
                    name="categoryNameEn"
                    value={form.categoryNameEn}
                    onChange={handleChange}
                    placeholder="Example: Slot Game"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-emerald-800/60 text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 cursor-text"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-emerald-200 mb-2">
                    Category Icon Upload
                  </label>

                  <label className="flex flex-col items-center justify-center gap-3 min-h-[170px] rounded-2xl border-2 border-dashed border-emerald-700/70 bg-black/40 hover:bg-emerald-950/30 transition-all cursor-pointer">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Category Icon"
                        className="w-24 h-24 object-contain rounded-2xl border border-emerald-700/50 bg-black/50 p-2"
                      />
                    ) : (
                      <FaImage className="text-5xl text-emerald-300/80" />
                    )}

                    <div className="text-center">
                      <p className="font-semibold text-white">
                        Click to upload icon
                      </p>
                      <p className="text-sm text-emerald-200/70">
                        jpeg, jpg, png, webp | max 5MB
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleIconChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-emerald-800/60 bg-black/40 px-5 py-4">
                  <div>
                    <p className="font-semibold text-white">IsActive</p>
                    <p className="text-sm text-emerald-200/70">
                      Active category will show on client site.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-red-800/70 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-6 after:h-6 after:rounded-full after:transition-all peer-checked:after:translate-x-6"></div>
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-800/60 bg-black/40 p-5 flex flex-col justify-between gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {isEditing ? "Update Category" : "Add New Category"}
                  </h3>

                  <div className="space-y-3 text-sm text-emerald-100/80">
                    <p>
                      Bangla:{" "}
                      <span className="text-white font-semibold">
                        {form.categoryNameBn || "-"}
                      </span>
                    </p>
                    <p>
                      English:{" "}
                      <span className="text-white font-semibold">
                        {form.categoryNameEn || "-"}
                      </span>
                    </p>
                    <p>
                      Status:{" "}
                      <span
                        className={
                          form.isActive
                            ? "text-emerald-300 font-semibold"
                            : "text-red-300 font-semibold"
                        }
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <FaSpinner className="animate-spin" />
                    ) : isEditing ? (
                      <FaSave />
                    ) : (
                      <FaPlusCircle />
                    )}
                    {isEditing ? "Update Category" : "Create Category"}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-white font-bold border border-slate-600/50 transition-all cursor-pointer"
                    >
                      <FaTimes />
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-green-950 via-emerald-950 to-black p-5 md:p-8 shadow-2xl shadow-emerald-950/50">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Category List
                </h2>
                <p className="text-emerald-200/70 text-sm">
                  Total: {categories.length}
                </p>
              </div>
            </div>

            {fetching ? (
              <div className="py-16 flex items-center justify-center text-emerald-200">
                <FaSpinner className="animate-spin text-3xl" />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-emerald-800/50 bg-black/30">
                <FaImage className="mx-auto text-5xl text-emerald-300/70 mb-3" />
                <p className="text-emerald-100 font-semibold">
                  No category found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:none]">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-emerald-800/60 text-left">
                      <th className="py-4 px-4 text-emerald-200">Icon</th>
                      <th className="py-4 px-4 text-emerald-200">Bangla</th>
                      <th className="py-4 px-4 text-emerald-200">English</th>
                      <th className="py-4 px-4 text-emerald-200">Status</th>
                      <th className="py-4 px-4 text-emerald-200 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {categories.map((cat) => (
                      <tr
                        key={cat._id}
                        className="border-b border-emerald-900/50 hover:bg-emerald-950/30 transition-all"
                      >
                        <td className="py-4 px-4">
                          <img
                            src={getImageUrl(cat.iconUrl)}
                            alt={cat?.categoryName?.en || "icon"}
                            className="w-14 h-14 rounded-xl object-contain bg-black/50 border border-emerald-800/50 p-2"
                          />
                        </td>

                        <td className="py-4 px-4 text-white font-semibold">
                          {cat?.categoryName?.bn || "-"}
                        </td>

                        <td className="py-4 px-4 text-emerald-100">
                          {cat?.categoryName?.en || "-"}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                              cat.isActive
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                                : "bg-red-500/15 text-red-300 border-red-400/30"
                            }`}
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-400/30 transition-all cursor-pointer"
                            >
                              <FaEdit />
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(cat._id)}
                              disabled={deletingId === cat._id}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-400/30 transition-all cursor-pointer disabled:opacity-60"
                            >
                              {deletingId === cat._id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaTrash />
                              )}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateCategory;
