import React from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import {
  Bookmark,
  Trash2,
  Scale,
  Compass,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { StudentPropertyCard } from '../../components/student/StudentPropertyCard';

export const StudentWishlistPage: React.FC = () => {
  const {
    savedProperties,
    clearWishlist,
    comparisonList,
  } = useStudent();

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Header with Distinctive Wishlist Visual Personality */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Personal Wishlist
            </span>
            <span className="text-xs text-colin-charcoal-500 font-medium">
              Persisted across your session
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-colin-navy tracking-tight font-display">
            Saved Accommodations ({savedProperties.length})
          </h1>
          <p className="text-xs text-colin-charcoal-500 max-w-xl">
            Keep track of your shortlisted student rooms, compare specs side-by-side, and reserve in-person inspection passes.
          </p>
        </div>

        {savedProperties.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link to="/student/compare">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
                leftIcon={<Scale size={13} />}
              >
                Compare ({comparisonList.length}/3)
              </Button>
            </Link>

            <button
              onClick={clearWishlist}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200"
            >
              <Trash2 size={13} />
              <span>Clear Wishlist</span>
            </button>

            <Link to="/student/explore">
              <Button variant="primary" size="sm" className="text-xs font-bold" leftIcon={<Compass size={13} />}>
                Find More Stays
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Saved Grid */}
      {savedProperties.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-colin-charcoal-200 shadow-sm space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Bookmark size={28} />
          </div>
          <h2 className="text-xl font-extrabold text-colin-navy">
            No Stays Saved Yet
          </h2>
          <p className="text-xs text-colin-charcoal-500 leading-relaxed">
            You haven't added any accommodations to your wishlist. Browse verified PGs and hostels near your university and tap the heart icon to save them here.
          </p>
          <Link to="/student/explore" className="inline-block pt-2">
            <Button variant="primary" size="md" className="justify-center">
              Browse Verified Stays Near Campus
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProperties.map((property) => (
            <StudentPropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
};
