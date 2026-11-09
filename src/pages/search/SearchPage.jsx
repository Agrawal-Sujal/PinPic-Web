import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { userApi } from '../../api/userApi';
import { useToast } from '../../context/ToastContext';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await userApi.searchUsers(query.trim());
        setUsers(results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleFollow = async (e, targetUser) => {
    e.stopPropagation();
    try {
      if (targetUser.isFollowing) {
        await userApi.unfollowUser(targetUser.id);
        setUsers(prev =>
          prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: false, followerCount: u.followerCount - 1 } : u))
        );
        showToast(`Unfollowed @${targetUser.username}`, 'info');
      } else {
        await userApi.followUser(targetUser.id);
        setUsers(prev =>
          prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: true, followerCount: u.followerCount + 1 } : u))
        );
        showToast(`Following @${targetUser.username}`, 'success');
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      showToast('Action failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-2xl mx-auto">
      {/* Header & Search Bar */}
      <div className="py-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Discover Friends</h1>

        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-12 pr-11 py-3.5 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 p-1 rounded-full text-pinpic-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results / Empty States */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-pinpic-coral" />
        </div>
      ) : query && users.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm font-semibold text-pinpic-text-secondary-light">
            No users found matching "{query}"
          </p>
        </div>
      ) : users.length > 0 ? (
        <div className="space-y-2">
          {users.map((targetUser) => (
            <div
              key={targetUser.id}
              onClick={() => navigate(`/user/${targetUser.id}`)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark hover:border-pinpic-coral/50 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-pinpic-coral/10 flex-shrink-0 border border-pinpic-border-light dark:border-pinpic-outline-dark">
                  {targetUser.pictureUrl ? (
                    <img src={targetUser.pictureUrl} alt={targetUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-pinpic-coral font-bold text-base">
                      {targetUser.name?.charAt(0) || targetUser.username?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{targetUser.name || targetUser.username}</h4>
                  <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark truncate">
                    @{targetUser.username}
                  </p>
                  <span className="text-[11px] text-pinpic-teal dark:text-pinpic-teal-dark font-medium">
                    {targetUser.followerCount || 0} followers
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => handleToggleFollow(e, targetUser)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  targetUser.isFollowing
                    ? 'bg-black/5 dark:bg-white/10 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/10'
                    : 'bg-pinpic-coral text-white shadow-sm hover:bg-pinpic-coral/90'
                }`}
              >
                {targetUser.isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
          <p className="text-sm">Type a name or username above to find other explorers</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;

