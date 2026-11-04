import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PropertyProvider } from '../context/PropertyContext';
import { StudentProvider } from '../context/StudentContext';
import { ToastProvider } from '../context/ToastContext';
import { OwnerLayout } from '../components/owner/OwnerLayout';
import { PropertyPhotoUploader } from '../components/owner/PropertyPhotoUploader';
import { PropertyCard } from '../components/property/PropertyCard';
import {
  PropertyPhoto,
  savePropertyPhotos,
  getPropertyPhotos,
  deletePropertyPhotos,
  validatePropertyPhotoFile,
} from '../utils/propertyImageStorage';
import { Property } from '../types';

// Helper component for testing PropertyPhotoUploader standalone
const StandaloneUploaderWrapper: React.FC<{
  initialPhotos?: PropertyPhoto[];
  ownerId?: string;
  propertyId?: string;
}> = ({ initialPhotos = [], ownerId = 'usr-owner-01', propertyId = 'prop-test-01' }) => {
  const [photos, setPhotos] = useState<PropertyPhoto[]>(initialPhotos);

  return (
    <div>
      <PropertyPhotoUploader
        photos={photos}
        onChange={setPhotos}
        ownerId={ownerId}
        propertyId={propertyId}
      />
      <div data-testid="photo-count">{photos.length}</div>
      <div data-testid="cover-photo-name">
        {photos.find((p) => p.isCover)?.name || 'none'}
      </div>
    </div>
  );
};

// Helper test wrapper for full context & routing
const OwnerTestWrapper: React.FC<{
  initialRoute?: string;
  initialAuthUser?: any;
  children: React.ReactNode;
}> = ({ initialRoute = '/owner/properties', initialAuthUser, children }) => {
  if (initialAuthUser) {
    localStorage.setItem('colin_auth_session', JSON.stringify(initialAuthUser));
  }
  return (
    <AuthProvider>
      <PropertyProvider>
        <StudentProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          </ToastProvider>
        </StudentProvider>
      </PropertyProvider>
    </AuthProvider>
  );
};

describe('COLIN Phase 3 Final Refinement — Fixed Sidebar & Photo Upload System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ================= 1. FIXED OWNER SIDEBAR SPECIFICATION =================
  describe('Requirement 1: Fixed Viewport Owner Sidebar', () => {
    it('renders sidebar with fixed viewport positioning and 3 independent sections', () => {
      const { container } = render(
        <OwnerTestWrapper
          initialAuthUser={{
            id: 'usr-owner-01',
            name: 'Col. Rajesh Sharma',
            email: 'rajesh.sharma@colin.in',
            role: 'owner',
          }}
        >
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="properties" element={<div>Properties Workspace Content</div>} />
            </Route>
          </Routes>
        </OwnerTestWrapper>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();

      // Desktop: Must use fixed viewport positioning (fixed top-0 left-0 bottom-0 h-screen)
      expect(sidebar?.className).toContain('fixed');
      expect(sidebar?.className).toContain('top-0');
      expect(sidebar?.className).toContain('left-0');
      expect(sidebar?.className).toContain('h-screen');

      // Section 1: Brand / COLIN Logo permanently fixed at top
      expect(screen.getByText('Host Portal')).toBeInTheDocument();
      expect(screen.getByAltText('COLIN Logo')).toBeInTheDocument();

      // Section 2: Navigation Menu items with distinctive brand accents
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Properties')).toBeInTheDocument();
      expect(screen.getByText('Rooms & Beds')).toBeInTheDocument();
      expect(screen.getByText('Student Coordination')).toBeInTheDocument();
      expect(screen.getByText('COLIN Verification')).toBeInTheDocument();
      expect(screen.getByText('Growth & Promotions')).toBeInTheDocument();
      expect(screen.getByText('Subscription')).toBeInTheDocument();
      expect(screen.getByText('Analytics & Revenue')).toBeInTheDocument();
      expect(screen.getByText('Business Settings')).toBeInTheDocument();

      // Section 3: Profile / Logout permanently anchored to bottom
      expect(screen.getByTitle('Sign Out')).toBeInTheDocument();

      // Main content wrapper must have left offset padding matching expanded sidebar width (md:pl-64)
      const mainWrapper = container.querySelector('div.flex-1.flex.flex-col');
      expect(mainWrapper?.className).toContain('md:pl-64');
    });

    it('toggles collapse and expand while maintaining fixed positioning and dynamic offset', () => {
      const { container } = render(
        <OwnerTestWrapper
          initialAuthUser={{
            id: 'usr-owner-01',
            name: 'Col. Rajesh Sharma',
            email: 'rajesh.sharma@colin.in',
            role: 'owner',
          }}
        >
          <Routes>
            <Route path="/owner/*" element={<OwnerLayout />}>
              <Route path="properties" element={<div>Properties Workspace</div>} />
            </Route>
          </Routes>
        </OwnerTestWrapper>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar?.className).toContain('w-64');

      // Find collapse button
      const toggleBtn = screen.getByLabelText('Collapse sidebar');
      fireEvent.click(toggleBtn);

      // Width becomes w-20 in collapsed mode
      expect(sidebar?.className).toContain('w-20');
      const mainWrapper = container.querySelector('div.flex-1.flex.flex-col');
      expect(mainWrapper?.className).toContain('md:pl-20');

      // Expand sidebar again
      const expandBtn = screen.getByLabelText('Expand sidebar');
      fireEvent.click(expandBtn);
      expect(sidebar?.className).toContain('w-64');
      expect(mainWrapper?.className).toContain('md:pl-64');
    });
  });

  // ================= 2. PROPERTY PHOTO UPLOAD SYSTEM =================
  describe('Requirement 2: Property Photo Upload System', () => {
    it('validates supported and unsupported file formats and size constraints', () => {
      // 1. Valid JPG
      const validJpg = new File(['dummy jpg content'], 'room1.jpg', { type: 'image/jpeg' });
      expect(validatePropertyPhotoFile(validJpg).valid).toBe(true);

      // 2. Valid PNG
      const validPng = new File(['dummy png content'], 'kitchen.png', { type: 'image/png' });
      expect(validatePropertyPhotoFile(validPng).valid).toBe(true);

      // 3. Valid WEBP
      const validWebp = new File(['dummy webp content'], 'balcony.webp', { type: 'image/webp' });
      expect(validatePropertyPhotoFile(validWebp).valid).toBe(true);

      // 4. Reject PDF
      const pdfFile = new File(['dummy pdf content'], 'lease_agreement.pdf', { type: 'application/pdf' });
      const pdfValidation = validatePropertyPhotoFile(pdfFile);
      expect(pdfValidation.valid).toBe(false);
      expect(pdfValidation.error).toContain('unsupported format');

      // 5. Reject Video
      const videoFile = new File(['dummy mp4 content'], 'room_tour.mp4', { type: 'video/mp4' });
      const videoValidation = validatePropertyPhotoFile(videoFile);
      expect(videoValidation.valid).toBe(false);

      // 6. Reject file > 5 MB
      const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge_photo.jpg', {
        type: 'image/jpeg',
      });
      const largeValidation = validatePropertyPhotoFile(largeFile);
      expect(largeValidation.valid).toBe(false);
      expect(largeValidation.error).toContain('exceeds the maximum allowed limit of 5 MB');
    });

    it('renders photo uploader interface with 0/8 counter, dropzone, and format guidance', () => {
      render(<StandaloneUploaderWrapper />);

      expect(screen.getByText('Property Photographs')).toBeInTheDocument();
      expect(screen.getByText('0/8 Photos Added')).toBeInTheDocument();
      expect(screen.getByText('8 slots remaining')).toBeInTheDocument();
      expect(screen.getByText('Add photographs of your property')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
      expect(screen.getByText(/JPG, JPEG, PNG, WEBP supported/i)).toBeInTheDocument();
      expect(screen.getByText(/Maximum 8 photographs/i)).toBeInTheDocument();
    });

    it('enforces maximum 8 photographs and rejects additional uploads', async () => {
      // Seed with 8 existing photos
      const seededPhotos: PropertyPhoto[] = Array.from({ length: 8 }).map((_, i) => ({
        id: `photo-${i + 1}`,
        propertyId: 'prop-test',
        ownerId: 'usr-owner-01',
        name: `photo_${i + 1}.jpg`,
        size: 200 * 1024,
        type: 'image/jpeg',
        dataUrl: `data:image/jpeg;base64,sample${i + 1}`,
        isCover: i === 0,
        createdAt: new Date().toISOString(),
      }));

      render(<StandaloneUploaderWrapper initialPhotos={seededPhotos} />);

      // Counter must indicate 8/8 full
      expect(screen.getByText('8/8 Photos Added')).toBeInTheDocument();
      expect(screen.getByText('Maximum 8 photographs reached')).toBeInTheDocument();
      expect(screen.getByText('Photo Limit Reached (8/8)')).toBeInTheDocument();

      // File input must be disabled
      const fileInput = screen.getByLabelText('Upload property photographs');
      expect(fileInput).toBeDisabled();

      // Attempt to drop a 9th photo
      const dropzone = screen.getByText('Photo Limit Reached (8/8)').closest('div.border-2');
      const extraFile = new File(['sample'], 'photo_9.jpg', { type: 'image/jpeg' });

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [extraFile],
        },
      });

      // Still 8 photos
      expect(screen.getByTestId('photo-count')).toHaveTextContent('8');
    });

    it('supports cover photo selection, reordering, and individual removal', async () => {
      const initialPhotos: PropertyPhoto[] = [
        {
          id: 'photo-1',
          propertyId: 'prop-test',
          ownerId: 'usr-owner-01',
          name: 'living_room.jpg',
          size: 150 * 1024,
          type: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,living',
          isCover: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo-2',
          propertyId: 'prop-test',
          ownerId: 'usr-owner-01',
          name: 'bedroom.jpg',
          size: 180 * 1024,
          type: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,bedroom',
          isCover: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'photo-3',
          propertyId: 'prop-test',
          ownerId: 'usr-owner-01',
          name: 'attached_bath.jpg',
          size: 120 * 1024,
          type: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,bath',
          isCover: false,
          createdAt: new Date().toISOString(),
        },
      ];

      render(<StandaloneUploaderWrapper initialPhotos={initialPhotos} />);

      expect(screen.getByText('3/8 Photos Added')).toBeInTheDocument();
      expect(screen.getByText('5 slots remaining')).toBeInTheDocument();
      expect(screen.getByTestId('cover-photo-name')).toHaveTextContent('living_room.jpg');

      // 1. Change cover photo to bedroom.jpg
      const setCoverBtns = screen.getAllByTitle('Set as Primary Cover Photo');
      expect(setCoverBtns.length).toBeGreaterThan(0);
      fireEvent.click(setCoverBtns[0]); // Click on bedroom
      expect(screen.getByTestId('cover-photo-name')).toHaveTextContent('bedroom.jpg');

      // 2. Remove living_room.jpg
      const removeBtn = screen.getByLabelText('Remove photograph living_room.jpg');
      fireEvent.click(removeBtn);

      // Count becomes 2
      expect(screen.getByTestId('photo-count')).toHaveTextContent('2');
      expect(screen.getByText('2/8 Photos Added')).toBeInTheDocument();
      expect(screen.queryByText('living_room.jpg')).not.toBeInTheDocument();
    });

    it('persists property photos in IndexedDB and enforces cross-owner isolation', async () => {
      const ownerA = 'usr-owner-A';
      const ownerB = 'usr-owner-B';
      const propId = 'prop-isolation-99';

      const photosA: PropertyPhoto[] = [
        {
          id: 'p-1',
          propertyId: propId,
          ownerId: ownerA,
          name: 'master_bedroom.jpg',
          size: 300 * 1024,
          type: 'image/jpeg',
          dataUrl: 'data:image/jpeg;base64,ownerA_image',
          isCover: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // Save photos for Owner A
      const saveRes = await savePropertyPhotos(propId, ownerA, photosA);
      expect(saveRes).toBe(true);

      // Owner A retrieves photos -> Success
      const retrievedA = await getPropertyPhotos(propId, ownerA);
      expect(retrievedA.length).toBe(1);
      expect(retrievedA[0].name).toBe('master_bedroom.jpg');

      // Owner B attempts to retrieve Owner A's photos -> Inaccessible (Empty array)
      const retrievedB = await getPropertyPhotos(propId, ownerB);
      expect(retrievedB.length).toBe(0);

      // Cleanup
      await deletePropertyPhotos(propId);
      const afterDelete = await getPropertyPhotos(propId, ownerA);
      expect(afterDelete.length).toBe(0);
    });

    it('renders professional placeholder when property has no photograph', () => {
      const noPhotoProperty: Property = {
        id: 'prop-no-photos',
        title: 'New Student Living Hub',
        category: 'pg',
        categoryLabel: 'Student PG',
        gender: 'boys',
        city: 'Delhi NCR',
        neighborhood: 'Kamla Nagar',
        landmark: 'Near Clock Tower',
        nearbyUniversity: 'Delhi University',
        distanceToUniversity: '300m',
        distanceToMetro: '5 mins',
        rentMonthly: 9000,
        depositAmount: 9000,
        foodIncluded: true,
        roomType: 'Triple Sharing',
        amenities: ['Wi-Fi'],
        isColinCertified: false,
        rating: 4.8,
        reviewsCount: 2,
        featuredImage: '', // No photo
        galleryImages: [], // No gallery photos
        availableFrom: 'Immediate',
        occupancyStatus: 'Available',
        description: 'Cozy student accommodation',
        highlights: [],
        houseRules: [],
        visitSlotFee: 150,
        refundGuaranteePercent: 55,
      };

      render(
        <OwnerTestWrapper>
          <PropertyCard property={noPhotoProperty} />
        </OwnerTestWrapper>
      );

      // Must display professional placeholder, not broken image
      expect(screen.getByText('No Photos Uploaded')).toBeInTheDocument();
      expect(screen.getByText('In-person inspection available')).toBeInTheDocument();
    });
  });
});
