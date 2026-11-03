import React, { useState, useMemo } from 'react';
import { SearchFilterState, AccommodationType } from '../types';
import { PROPERTIES } from '../data/mockData';
import { useProperties } from '../context/PropertyContext';
import { HeroSection } from '../components/home/HeroSection';
import { CategoriesSection } from '../components/home/CategoriesSection';
import { FeaturedPropertiesSection } from '../components/home/FeaturedPropertiesSection';
import { WhyColinSection } from '../components/home/WhyColinSection';
import { HowColinWorksSection } from '../components/home/HowColinWorksSection';
import { ColinLivingSection } from '../components/home/ColinLivingSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { OwnerCtaSection } from '../components/home/OwnerCtaSection';

export const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilterState>({
    city: 'All Cities',
    category: 'all',
    gender: 'all',
    maxBudget: 25000,
    certifiedOnly: false,
    foodIncludedOnly: false,
    searchQuery: '',
  });

  const handleResetFilters = () => {
    setFilters({
      city: 'All Cities',
      category: 'all',
      gender: 'all',
      maxBudget: 25000,
      certifiedOnly: false,
      foodIncludedOnly: false,
      searchQuery: '',
    });
  };

  let propertiesSource = PROPERTIES;
  try {
    const propCtx = useProperties();
    if (propCtx?.properties) {
      propertiesSource = propCtx.properties;
    }
  } catch {}

  const filteredProperties = useMemo(() => {
    return propertiesSource.filter((p) => {
      // REQUIREMENT 4: Homepage property showcase displays ONLY properties with paid sponsorship
      if (!p.isSponsored) {
        return false;
      }
      // City filter
      if (filters.city !== 'All Cities' && p.city !== filters.city) {
        return false;
      }
      // Category filter
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false;
      }
      // Gender filter
      if (filters.gender !== 'all' && p.gender !== filters.gender) {
        return false;
      }
      // Budget filter
      if (p.rentMonthly > filters.maxBudget) {
        return false;
      }
      // Certified filter
      if (filters.certifiedOnly && !p.isColinCertified) {
        return false;
      }
      // Food included filter
      if (filters.foodIncludedOnly && !p.foodIncluded) {
        return false;
      }
      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <HeroSection filters={filters} onFilterChange={setFilters} />
      
      <CategoriesSection
        selectedCategory={filters.category}
        onSelectCategory={(cat: AccommodationType) =>
          setFilters((prev) => ({ ...prev, category: cat }))
        }
      />

      <FeaturedPropertiesSection
        properties={filteredProperties}
        onResetFilters={handleResetFilters}
      />

      <WhyColinSection />

      <HowColinWorksSection />

      <ColinLivingSection />

      <TestimonialsSection />

      <OwnerCtaSection />
    </div>
  );
};
