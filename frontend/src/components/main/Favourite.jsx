import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Favourite = () => {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favBusy, setFavBusy] = useState({});

  const fetchFavourites = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        fav_uuid,
        created_at,
        file:f_uuid(
          f_uuid,
          f_name,
          language,
          created_at,
          file_department(
            d_uuid,
            department:d_uuid ( d_uuid, d_name )
          )
        )
      `)
      .eq("uuid", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const normalized =
        (data || [])
          .filter((row) => row.file)
          .map((row) => ({
            ...row,
            file: {
              ...row.file,
              departments: (row.file.file_department || [])
                .map((fd) => fd?.department)
                .filter(Boolean),
              is_favorite: true, // everything on this page is favorited
            },
          }));
      setFavourites(normalized);
    } else {
      setFavourites([]);
      console.error("Error fetching favourites:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavourites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleFavorite = async (file) => {
    if (!user?.id) return;
    const id = file.f_uuid;
    // optimistic: remove from list on unfavorite
    setFavourites(prev => prev.filter(f => f.file?.f_uuid !== id));
    setFavBusy(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from("favorites")
        .delete()
        .eq("uuid", user.id)
        .eq("f_uuid", id);
      if (error) throw error;
    } catch (e) {
      // revert on failure
      setFavourites(prev => [{ file, fav_uuid: `tmp-${id}` }, ...prev]);
      console.error("Unfavorite failed:", e);
    } finally {
      setFavBusy(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="p-8 bg-white min-h-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Favourites</h1>

      {loading ? (
        <p className="text-gray-600">Loading favourites...</p>
      ) : favourites.length === 0 ? (
        <p className="text-gray-500">No favourite files yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch auto-rows-[minmax(260px,_1fr)]">
          {favourites.map((fav) => {
            const file = fav.file;
            return (
              <div
                key={fav.fav_uuid}
                className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col h-full transition-transform hover:scale-105"
              >
                <div className="flex-1 w-full">
                  <div className="text-xl font-semibold text-gray-800 mb-2">
                    {file.f_name}
                  </div>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {file.departments && file.departments.length > 0 ? (
                      file.departments.map((dept) => (
                        <span
                          key={`${file.f_uuid}-${dept.d_uuid}`}
                          className="inline-block text-xs bg-gray-200 text-gray-700 rounded px-2 py-1"
                        >
                          {dept.d_name}
                        </span>
                      ))
                    ) : (
                      <span className="inline-block text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-1">
                        No Department
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Language: {file.language || "Unknown"}
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                  </div>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center justify-center h-9 px-4 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    View
                  </button>
                  <Link
                    to={`/summary`}
                    className="inline-flex items-center justify-center h-9 px-4 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Summary
                  </Link>
                  <button
                    type="button"
                    className={`ml-2 inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ${
                      file.is_favorite ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"
                    } text-white`}
                    onClick={() => toggleFavorite(file)}
                    disabled={!!favBusy[file.f_uuid]}
                  >
                    {file.is_favorite ? "Unfavorite" : "Favorite"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Favourite;