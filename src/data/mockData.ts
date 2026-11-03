import { Property, LivingService, VisitBooking } from '../types';

export const CITIES = [
  'All Cities',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Mumbai',
  'Kota',
  'Hyderabad',
];

export const CATEGORIES = [
  { id: 'all', label: 'All Stays', count: 24, icon: 'Home' },
  { id: 'pg', label: 'PGs', count: 12, icon: 'Users' },
  { id: 'hostel', label: 'Student Hostels', count: 5, icon: 'Building' },
  { id: 'rental-room', label: 'Rental Rooms', count: 4, icon: 'Key' },
  { id: 'shared-flat', label: 'Shared Flats', count: 2, icon: 'Maximize' },
  { id: 'co-living', label: 'Co-Living', count: 1, icon: 'Sparkles' },
] as const;

export const UNIVERSITIES_LIST = [
  'All Universities / Institutes',
  'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
  'DU South Campus (Venky, ARSD, Motilal, Ram Lal)',
  'Christ (Deemed to be University) & St. John’s Medical',
  'Symbiosis International University (SLS, SCMS, SCMC)',
  'IIT Bombay & NITIE (IIM Mumbai)',
  'Allen Career Institute, Resonance & Career Point',
  'IIIT Hyderabad & University of Hyderabad (HCU)',
  'MIT World Peace University & Cummins College',
  'Amity University, Noida',
  'IIT Delhi (Hauz Khas)'
];

export const PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    title: 'COLIN Heights — Premium Student PG',
    category: 'pg',
    categoryLabel: 'Premium PG',
    gender: 'boys',
    city: 'Delhi NCR',
    neighborhood: 'Hudson Lane, North Campus',
    fullAddress: 'Plot 42-B, Hudson Lane, GTB Nagar, Near Khalsa College Gate, Delhi - 110009',
    ownerName: 'Col. Rajesh Sharma (Retd.)',
    ownerContact: '+91 98110 44219',
    ownerEmail: 'rajesh.sharma@colinhousing.in',
    landmark: 'Behind Guru Tegh Bahadur Metro Station (Gate 2)',
    nearbyUniversity: 'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
    distanceToUniversity: '350m walk to Campus',
    distanceToMetro: '2 mins walk to GTB Nagar Metro',
    latitude: 28.6942,
    longitude: 77.2085,
    rentMonthly: 12500,
    depositAmount: 12500,
    foodIncluded: true,
    roomType: 'Double Sharing with Attached Balcony & Bath',
    sharingType: 'double',
    availableRooms: 3,
    availableBeds: 5,
    virtualTourAvailable: true,
    mealOptions: ['Breakfast Buffet', 'Packaged Campus Lunch', 'Evening Chai & Snacks', 'Wholesome Dinner'],
    createdAt: '2026-10-15',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 320,
      foodHygieneAuditScore: 98,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Deluxe Twin Bedroom',
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        description: 'Spacious 180 sq.ft room with two orthopedic single beds, individual solid-wood study desks, ergonomic chairs, and large window opening to tree-lined Hudson Lane.',
        dimensions: '15 ft × 12 ft',
        hotspots: [
          { label: 'Ergonomic Study Station', x: 25, y: 55, info: 'Equipped with LED study lamp, USB-C fast charging, and overhead bookshelf.' },
          { label: 'Orthopedic Mattress', x: 68, y: 70, info: 'High-density foam mattress with dust-mite barrier cover.' },
          { label: 'Split Air Conditioner', x: 50, y: 18, info: '1.5-ton 5-star inverter split AC with quiet night mode.' }
        ]
      },
      {
        id: 'bathroom',
        name: 'Ensuite Western Bathroom',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
        description: 'Pristine private bathroom with 25L instant water geyser, anti-skid vitrified ceramic tiles, modern chrome fixtures, and dual ventilation.',
        dimensions: '7 ft × 6 ft',
        hotspots: [
          { label: 'Instant Water Geyser', x: 30, y: 25, info: '25-liter automatic geyser with 24/7 hot water supply.' },
          { label: 'Anti-Skid Flooring', x: 55, y: 82, info: 'Textured tiles verified safe and sanitized weekly.' }
        ]
      },
      {
        id: 'study',
        name: 'Silent Library & Reading Hall',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        description: 'A dedicated quiet zone on the 2nd floor with sound dampening, high-speed dual Wi-Fi routers, ergonomic task chairs, and DU previous year exam archives.',
        dimensions: '28 ft × 16 ft',
        hotspots: [
          { label: 'High-Speed Wi-Fi Router', x: 45, y: 20, info: '300 Mbps dedicated enterprise lease line.' },
          { label: 'Soundproof Partitions', x: 80, y: 50, info: 'Acoustic glass panels minimizing corridor noise.' }
        ]
      },
      {
        id: 'dining',
        name: 'Hygienic Dining Mess & Cafe',
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
        description: 'Commercial stainless-steel student dining lounge. Daily changing menu featuring wholesome North & South Indian dishes prepared in a certified kitchen.',
        dimensions: '30 ft × 20 ft',
        hotspots: [
          { label: 'Stainless Steel Buffet Counters', x: 35, y: 60, info: 'Heated stainless food serving warm meals three times daily.' },
          { label: 'Industrial RO Drinking Water', x: 75, y: 40, info: '7-stage UV/UF water filtration with TDS monitor tested weekly.' }
        ]
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (300 Mbps)',
      '3 Nutritious North/South Indian Meals',
      'Split Air Conditioning',
      'Biometric 24/7 Security Entry',
      'Daily Room Housekeeping',
      'RO Drinking Water & Water Cooler',
      '100% Full Power Backup (DG)',
      'Free Laundry Machine Usage',
      'Dedicated Ergonomic Study Desk & Lamp'
    ],
    isColinCertified: true,
    certificationScore: 99,
    certificationDate: '12 October 2026',
    verificationStatus: 'approved',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: true,
    rating: 4.9,
    reviewsCount: 42,
    featuredImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Few Beds Left',
    description: 'A benchmark student PG in the heart of DU North Campus. Fully managed with zero brokerage, chef-curated wholesome meals, quiet study environment, and strict biometric security. Supervised by verified COLIN resident ambassadors.',
    highlights: [
      'Zero Brokerage — Direct verification through COLIN',
      'In-person verified by COLIN volunteer team on 12-Oct-2026',
      'Hygienic 3-tier food trial passed by food safety audit',
      'Late-night library study curfew permissions with parental portal'
    ],
    houseRules: [
      'Visitor hours: 9:00 AM - 8:00 PM in the common lounge',
      'Quiet study hours observed strictly from 11:00 PM to 6:00 AM',
      'Non-smoking and alcohol-free premise'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: true,
    sponsorshipTier: 'Homepage Sponsored',
    sponsoredBadge: 'Sponsored'
  },
  {
    id: 'prop-2',
    title: 'Grace Residency — Girls Luxury PG & Co-living',
    category: 'pg',
    categoryLabel: 'Luxury PG',
    gender: 'girls',
    city: 'Delhi NCR',
    neighborhood: 'Satya Niketan, South Campus',
    fullAddress: 'Building 118, Satya Niketan, Opposite Sri Venkateswara College, New Delhi - 110021',
    ownerName: 'Mrs. Sunita Verma',
    ownerContact: '+91 99580 12894',
    ownerEmail: 'sunita.verma@graceresidency.com',
    landmark: 'Right opposite Sri Venkateswara College Footbridge',
    nearbyUniversity: 'DU South Campus (Venky, ARSD, Motilal, Ram Lal)',
    distanceToUniversity: '120m from Venkateswara College',
    distanceToMetro: '4 mins to Durgabai Deshmukh South Campus Metro',
    latitude: 28.5862,
    longitude: 77.1685,
    rentMonthly: 14000,
    depositAmount: 14000,
    foodIncluded: true,
    roomType: 'Twin Sharing Deluxe with Ensuite Bathroom',
    sharingType: 'double',
    availableRooms: 2,
    availableBeds: 4,
    virtualTourAvailable: true,
    mealOptions: ['Breakfast Buffet', 'College Packed Lunch', 'Evening Tea & Biscuits', 'Dinner Buffet'],
    createdAt: '2026-10-18',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 250,
      foodHygieneAuditScore: 99,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Deluxe Twin Room',
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
        description: 'Sunlit designer room with private balcony, soundproof windows, and hardwood storage wardrobes with individual digital lockers.',
        dimensions: '16 ft × 13 ft'
      },
      {
        id: 'lounge',
        name: 'Female Scholars Lounge',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        description: 'Vibrant living lounge with comfortable beanbags, floor-to-ceiling glass windows, community refrigerator, and micro-kitchen.',
        dimensions: '22 ft × 18 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (250 Mbps)',
      '4 Meals Daily (Breakfast, Lunch, High Tea, Dinner)',
      'Air Conditioning & Heating',
      'Female Warden & 24/7 CCTV Survelliance',
      'Soundproof Study Hall with High-speed printing',
      'Fully Automatic Laundromat',
      'Daily Sanitization & Room Cleaning',
      'Power Backup & Solar Water Heaters'
    ],
    isColinCertified: true,
    certificationScore: 98,
    certificationDate: '18 October 2026',
    verificationStatus: 'approved',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: true,
    rating: 4.95,
    reviewsCount: 56,
    featuredImage: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540518614846-7ede433c4ef5?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Available Now',
    occupancyStatus: 'Filling Fast',
    description: 'Designed exclusively for female undergraduate and postgraduate scholars. Grace Residency offers total peace of mind with 24/7 female security staff, wholesome home-style buffet meals, quiet study corners, and vibrant common areas.',
    highlights: [
      '100% In-Person Inspected by COLIN with highest safety rating',
      'Parent check-in dashboard & night gate digital register',
      'Walking distance to top South Campus colleges and cafe avenue'
    ],
    houseRules: [
      'Digital entry log required after 9:30 PM',
      'Female family members allowed in room with advance notice',
      'Cleanliness audit weekly'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: true,
    sponsorshipTier: 'Homepage Sponsored',
    sponsoredBadge: 'Sponsored'
  },
  {
    id: 'prop-3',
    title: 'The Scholar Hub — Koramangala Co-Living',
    category: 'co-living',
    categoryLabel: 'Modern Co-Living',
    gender: 'unisex',
    city: 'Bengaluru',
    neighborhood: '8th Block, Koramangala',
    fullAddress: 'No. 344, 80 Feet Road, 8th Block, Near Christ University Main Gate, Bengaluru - 560095',
    ownerName: 'Vikas Ramamurthy',
    ownerContact: '+91 97412 88390',
    ownerEmail: 'vikas@thescholarhub.in',
    landmark: '500m from Christ University Gate 1',
    nearbyUniversity: 'Christ (Deemed to be University) & St. John’s Medical',
    distanceToUniversity: '6 mins walk to Christ Campus',
    distanceToMetro: '8 mins to Dairy Circle Metro',
    latitude: 12.9352,
    longitude: 77.6245,
    rentMonthly: 16500,
    depositAmount: 20000,
    foodIncluded: false,
    roomType: 'Private Studio or Twin Pod Sharing',
    sharingType: 'single',
    availableRooms: 4,
    availableBeds: 4,
    virtualTourAvailable: true,
    createdAt: '2026-10-05',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 500,
      foodHygieneAuditScore: 95,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Private Studio Quarters',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        description: 'Independent studio with acoustic noise insulation, private workstation, smart TV, mini fridge, and balcony.',
        dimensions: '20 ft × 14 ft'
      },
      {
        id: 'cowork',
        name: 'Startup & Scholar Co-Work Loft',
        image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
        description: 'Spacious workspace with whiteboard meeting rooms, 500 Mbps fiber, and artisan coffee station.',
        dimensions: '35 ft × 25 ft'
      }
    ],
    amenities: [
      'Gigabit Fiber Wi-Fi (500 Mbps)',
      'Community Kitchen & Cafe Barista Onsite',
      'Co-Working Lounge with Whiteboards & Pods',
      'Gym & Yoga Terrace',
      'PlayStation 5 & Table Tennis Recreation Room',
      'Biometric RFID Access Control',
      'Weekly Linen & Laundry Service',
      'Uninterrupted 100% Power Generator'
    ],
    isColinCertified: false,
    verificationStatus: 'inspection_scheduled',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.88,
    reviewsCount: 38,
    featuredImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'November 2026',
    occupancyStatus: 'Available',
    description: 'A modern co-living space blending student focus with community energy. Featuring sound-isolated study pods, rooftop chillout zones, and vibrant tech/design student cohorts from Christ University and startup interns.',
    highlights: [
      'Vibrant community with weekly tech talks and movie screenings',
      'Ultra fast 500 Mbps internet perfect for developers and research scholars',
      'Flexible 3-month or 11-month lease terms with zero broker cuts'
    ],
    houseRules: [
      'Responsible alcohol policy in private quarters; common areas dry',
      'Co-working lounge maintains quiet focus from 9 AM - 6 PM',
      'Pet friendly in designated studio apartments'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: true,
    sponsorshipTier: 'Homepage Sponsored',
    sponsoredBadge: 'Sponsored'
  },
  {
    id: 'prop-4',
    title: 'SymbiNest Student Hostel — Viman Nagar',
    category: 'hostel',
    categoryLabel: 'Student Hostel',
    gender: 'girls',
    city: 'Pune',
    neighborhood: 'Viman Nagar, Central Pune',
    fullAddress: 'Lane 2, Near Symbiosis Law School, Viman Nagar, Pune - 411014',
    ownerName: 'Anil & Pratibha Kulkarni',
    ownerContact: '+91 94220 33912',
    ownerEmail: 'symbinest.pune@gmail.com',
    landmark: 'Behind Phoenix Marketcity / Next to SLS Pune',
    nearbyUniversity: 'Symbiosis International University (SLS, SCMS, SCMC)',
    distanceToUniversity: '400m walk to Symbiosis Campus',
    distanceToMetro: '6 mins to Ramwadi Metro Station',
    latitude: 18.5679,
    longitude: 73.9143,
    rentMonthly: 11500,
    depositAmount: 15000,
    foodIncluded: true,
    roomType: 'Triple or Double Sharing Room with Balcony',
    sharingType: 'triple',
    availableRooms: 2,
    availableBeds: 6,
    virtualTourAvailable: true,
    mealOptions: ['Traditional Maharashtrian Breakfast', 'Tiffin Lunch for College', 'High Tea', 'Pure Veg Dinner Buffet'],
    createdAt: '2026-09-24',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 180,
      foodHygieneAuditScore: 97,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Triple Student Room',
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        description: 'Roomy triple sharing arrangement with individual wardrobes, study desks, and attached balcony overlooking the garden.',
        dimensions: '18 ft × 15 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (150 Mbps)',
      'Pure Veg Hygienic Maharashtrian & North Indian Meals',
      'AC with individual temperature controls',
      '24/7 Security with Smart Access Cards',
      'Study Room with Reference Library',
      'Washing Machines & Ironing Stations',
      'Hot Water Supply 24 Hours (Solar + Geyser)',
      'Doctor on Call Facility'
    ],
    isColinCertified: false,
    verificationStatus: 'payment_pending',
    inspectionRequested: true,
    inspectionPaid: false,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.82,
    reviewsCount: 31,
    featuredImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Few Beds Left',
    description: 'Trusted by hundreds of Symbiosis students over the past 6 years. Clean, homely, disciplined, and within short walking distance to colleges, cafes, and Phoenix Marketcity.',
    highlights: [
      'Homely supervision by retired educators',
      '100% vegetarian hygienic food with sunday special meals',
      'COLIN Certified premises with verified background checked staff'
    ],
    houseRules: [
      'Curfew time: 10:00 PM (10:30 PM on weekends with gate pass)',
      'Visitors permitted in ground floor reception lobby',
      'Zero ragging tolerance policy'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: true,
    sponsorshipTier: 'Homepage Sponsored',
    sponsoredBadge: 'Sponsored'
  },
  {
    id: 'prop-5',
    title: 'Powai Lakeview 2BHK Shared Flat for IIT Scholars',
    category: 'shared-flat',
    categoryLabel: 'Shared Apartment',
    gender: 'boys',
    city: 'Mumbai',
    neighborhood: 'Hiranandani Gardens, Powai',
    fullAddress: 'Tower 7, Eden Woods, Hiranandani Gardens, Powai, Mumbai - 400076',
    ownerName: 'Deepak Merchant',
    ownerContact: '+91 98201 55670',
    ownerEmail: 'deepak.merchant@mumbaiapartments.co',
    landmark: 'Opposite Galleria Shopping Mall, 1 km to IIT Main Gate',
    nearbyUniversity: 'IIT Bombay & NITIE (IIM Mumbai)',
    distanceToUniversity: '1.2 km (Quick auto / cycling distance)',
    distanceToMetro: '10 mins to Powai Metro Line 6',
    latitude: 19.1254,
    longitude: 72.9152,
    rentMonthly: 15500,
    depositAmount: 30000,
    foodIncluded: false,
    roomType: 'Private Room in Furnished 2BHK',
    sharingType: 'single',
    availableRooms: 1,
    availableBeds: 1,
    virtualTourAvailable: true,
    createdAt: '2026-10-01',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 300,
      foodHygieneAuditScore: 92,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Master Bedroom with Balcony',
        image: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef5?auto=format&fit=crop&w=1200&q=80',
        description: 'Quiet room with scenic city and greenery view. Air-conditioned with king bed, study desk, and private bath.',
        dimensions: '16 ft × 14 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (300 Mbps)',
      'Fully Equipped Modular Kitchen with Piped Gas',
      'Air Conditioned Bedrooms & Living Hall',
      'Washing Machine, Refrigerator & Microwave',
      'Gated Society with Swimming Pool & Gym',
      '24/7 Security & Video Doorbell',
      'Balcony with Scenic Powai Lake View',
      'Car & Bike Covered Parking'
    ],
    isColinCertified: true,
    certificationScore: 94,
    certificationDate: '22 October 2026',
    verificationStatus: 'approved',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: true,
    rating: 4.79,
    reviewsCount: 19,
    featuredImage: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef5?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1540518614846-7ede433c4ef5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Available',
    description: 'Looking for a flatmate in a modern 2BHK overlooking Powai. Fully furnished with modular kitchen, high-speed fiber, and premium society amenities. Perfect for IIT B research scholars or tech graduates.',
    highlights: [
      'Gated society living with no restrictive curfews',
      'Direct connection with verified IIT flatmates',
      'Zero brokerage fee verified by COLIN inspection team'
    ],
    houseRules: [
      'Society bylaws strictly maintained',
      'Electricity bills split equally among flatmates',
      'Responsible hosting allowed'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-6',
    title: 'Apex Coaching Scholars Residency — Landmark City',
    category: 'hostel',
    categoryLabel: 'Aspirant Hostel',
    gender: 'boys',
    city: 'Kota',
    neighborhood: 'Landmark City, Kunadi',
    fullAddress: 'Road No. 3, Landmark City, Near Allen SAMYAK Campus, Kota, Rajasthan - 324008',
    ownerName: 'Surender Singh Hada',
    ownerContact: '+91 94141 77209',
    ownerEmail: 'hada.hostels@kotastudy.org',
    landmark: '200m from Allen SAMYAK Coaching Institute',
    nearbyUniversity: 'Allen Career Institute, Resonance & Career Point',
    distanceToUniversity: '3 mins walk to Allen SAMYAK',
    distanceToMetro: 'Kota Junction Railway Station (15 mins)',
    latitude: 25.1860,
    longitude: 75.8236,
    rentMonthly: 9800,
    depositAmount: 10000,
    foodIncluded: true,
    roomType: 'Single Study Room with Large Desk & Bookshelf',
    sharingType: 'single',
    availableRooms: 5,
    availableBeds: 5,
    virtualTourAvailable: true,
    mealOptions: ['Healthy Energy Breakfast', 'Wholesome Lunch', 'Evening Milk & Snacks', 'Light Dinner with Salad'],
    createdAt: '2026-10-28',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 120,
      foodHygieneAuditScore: 99,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    amenities: [
      'Distraction-Free Wi-Fi with Study Access Restrictions',
      'Hygienic 4-Time Pure Veg Nutrition Buffet',
      'Acoustic Soundproofing in every room',
      'On-call Counsellor & Mentor Support',
      'Bio-metric Attendance with Instant SMS to Parents',
      '24/7 Power Backup with Inverter & Generator',
      'Air Cooled / AC options',
      'Daily Laundry Service'
    ],
    isColinCertified: true,
    certificationScore: 91,
    certificationDate: '15 October 2026',
    verificationStatus: 'approved',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: true,
    rating: 4.93,
    reviewsCount: 64,
    featuredImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Few Beds Left',
    description: 'Specifically engineered for NEET and JEE aspirants in Kota. Features silence-optimized private study rooms, ergonomic study seating, memory-retention lighting, hygienic digestion-friendly food, and emotional wellness mentoring.',
    highlights: [
      'Verified zero harassment & anti-ragging environment',
      'Special student wellness counselor visiting twice a week',
      'Parental weekly attendance and meal satisfaction reports'
    ],
    houseRules: [
      'Strict night study silence hours from 10 PM',
      'Mobile device curfew option available on parental request',
      'Alcohol, tobacco and gaming strictly prohibited'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-7',
    title: 'CyberNest Co-Living & PG — HITEC City',
    category: 'co-living',
    categoryLabel: 'Tech Student Living',
    gender: 'unisex',
    city: 'Hyderabad',
    neighborhood: 'Madhapur, HITEC City',
    fullAddress: 'Ayyappa Society, Main Road, Madhapur, Hyderabad - 500081',
    ownerName: 'K. R. Rao & Sons',
    ownerContact: '+91 99890 23411',
    ownerEmail: 'cybernest.hyd@colin.in',
    landmark: 'Near Ayyappa Society 100ft Road / 1 km to Cyber Towers',
    nearbyUniversity: 'IIIT Hyderabad & University of Hyderabad (HCU)',
    distanceToUniversity: '2.5 km from IIIT Hyderabad',
    distanceToMetro: '5 mins to Durgam Cheruvu Metro Station',
    latitude: 17.4483,
    longitude: 78.3915,
    rentMonthly: 13500,
    depositAmount: 15000,
    foodIncluded: true,
    roomType: 'Twin Sharing or Private Pod',
    sharingType: 'double',
    availableRooms: 3,
    availableBeds: 6,
    virtualTourAvailable: true,
    mealOptions: ['Hyderabadi Breakfast', 'Lunch Tiffin Box', 'Tea & Samosas', 'Dinner with Weekend Biryani'],
    createdAt: '2026-10-15',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 350,
      foodHygieneAuditScore: 96,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    amenities: [
      'Ultra Fast 350 Mbps Dual Fiber Wi-Fi',
      '3 South & North Indian Meals + Chai Point',
      'Air Conditioned Rooms with Smart Lockers',
      'High-Tech Common Study & Hackathon Hall',
      'Rooftop Open Air Cinema & BBQ Lounge',
      'Daily Professional Housekeeping',
      'Full DG Power Backup 24/7',
      'Free Washing Machine Facilities'
    ],
    isColinCertified: false,
    verificationStatus: 'not_requested',
    inspectionRequested: false,
    inspectionPaid: false,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.86,
    reviewsCount: 29,
    featuredImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Available Now',
    occupancyStatus: 'Available',
    description: 'A vibrant tech-hub co-living community for university scholars, coding bootcamp fellows, and tech interns. High-speed networking, collaborative spaces, and chef-curated hyderabad meals.',
    highlights: [
      'Frequent weekend tech workshops and peer hackathons',
      'Zero brokerage and transparent slot visits with guaranteed refund policy',
      'Certified directly by COLIN inspection engineers'
    ],
    houseRules: [
      'Common workspace silent hours during business sprints',
      'Guests allowed in rooftop lounge until 9:30 PM',
      'Smoke-free premises'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-8',
    title: 'University Green Stay — Single Rental Room',
    category: 'rental-room',
    categoryLabel: 'Private Rental Room',
    gender: 'unisex',
    city: 'Pune',
    neighborhood: 'Kothrud, Near MIT College',
    fullAddress: 'B-12, Mayur Colony, Near MIT World Peace University, Kothrud, Pune - 411038',
    ownerName: 'Prof. Ramesh Joshi',
    ownerContact: '+91 98221 89045',
    ownerEmail: 'ramesh.joshi@puneuni.ac.in',
    landmark: 'Next to Mayur Colony Garden',
    nearbyUniversity: 'MIT World Peace University & Cummins College',
    distanceToUniversity: '600m from MIT-WPU Campus',
    distanceToMetro: '8 mins to Vanaz Metro Station',
    latitude: 18.5074,
    longitude: 73.8077,
    rentMonthly: 8500,
    depositAmount: 12000,
    foodIncluded: false,
    roomType: 'Private Independent Room with Attached Bath',
    sharingType: 'single',
    availableRooms: 1,
    availableBeds: 1,
    virtualTourAvailable: true,
    createdAt: '2026-10-08',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: false,
      wifiSpeedMbps: 100,
      foodHygieneAuditScore: 90,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    amenities: [
      'High-Speed Wi-Fi (100 Mbps)',
      'Independent Private Entrance with Key',
      'Attached Clean Western Bathroom & Geyser',
      'Wardrobe, Study Table & Chair Provided',
      'Water Filter & Drinking Water Access',
      'Quiet Residential Green Neighborhood',
      'Two-Wheeler Covered Parking Spot'
    ],
    isColinCertified: false,
    verificationStatus: 'inspection_in_progress',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.75,
    reviewsCount: 16,
    featuredImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Available',
    description: 'An independent private room on the first floor of an academic family residence. Perfect for postgraduate students or serious researchers seeking quiet concentration and total privacy without middleman fees.',
    highlights: [
      'Direct owner deal with verified retired university professor',
      '100% zero brokerage through COLIN platform',
      'Quiet and safe residential green street'
    ],
    houseRules: [
      'Self-contained independent entry',
      'Cleanliness of private room and bath maintained by tenant',
      'No loud music after 10 PM'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  // Phase 2 Additional Realistic Listings (Discoverable in Student Directory)
  {
    id: 'prop-9',
    title: 'North Campus Scholar Pad — 3BHK Shared Flat',
    category: 'shared-flat',
    categoryLabel: 'Shared Flat',
    gender: 'unisex',
    city: 'Delhi NCR',
    neighborhood: 'Kamla Nagar, North Campus',
    fullAddress: '31/8, Bungalow Road, Kamla Nagar, Near Hansraj College, Delhi - 110007',
    ownerName: 'Manish Chawla',
    ownerContact: '+91 98101 23998',
    ownerEmail: 'manish.chawla@studentpads.in',
    landmark: 'Opposite Spark Mall, 200m to Hansraj College Gate',
    nearbyUniversity: 'Delhi University (North Campus — SRCC, Hindu, Hansraj)',
    distanceToUniversity: '250m to Hansraj / Hindu College',
    distanceToMetro: '6 mins to Vishwavidyalaya Metro',
    latitude: 28.6811,
    longitude: 77.2038,
    rentMonthly: 9500,
    depositAmount: 10000,
    foodIncluded: false,
    roomType: 'Double Sharing in Furnished 3BHK',
    sharingType: 'double',
    availableRooms: 2,
    availableBeds: 3,
    virtualTourAvailable: true,
    createdAt: '2026-10-25',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 200,
      foodHygieneAuditScore: 91,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Shared Double Room',
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        description: 'Large airy room with twin single beds, two desks, and balcony.',
        dimensions: '16 ft × 12 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (200 Mbps)',
      'Split Air Conditioning in all rooms',
      'Fully Equipped Shared Kitchen & Microwave',
      'Fully Automatic Washing Machine',
      '24/7 Power Backup',
      'Balcony with Kamla Nagar High Street View',
      'Daily Dustbin Cleaning'
    ],
    isColinCertified: true,
    certificationScore: 96,
    certificationDate: '26 October 2026',
    verificationStatus: 'approved',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: true,
    rating: 4.81,
    reviewsCount: 22,
    featuredImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Available',
    description: 'Charming shared student apartment steps from DU North Campus college gates. Huge rooms with sunlight, wooden closets, and high-speed fiber for online lectures.',
    highlights: [
      'Walking distance to top North Campus libraries and cultural cafes',
      'Zero brokerage agreement verified by COLIN',
      'Separate lockable wardrobe and private study desk'
    ],
    houseRules: [
      'Quiet hours from 11 PM to 6 AM',
      'Kitchen cleaning rotation among flatmates',
      'Guests allowed in common living room with mutual consent'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-10',
    title: 'Silicon Valley Girls Hostel — Electronic City',
    category: 'hostel',
    categoryLabel: 'Student Hostel',
    gender: 'girls',
    city: 'Bengaluru',
    neighborhood: 'Electronic City Phase 1',
    fullAddress: 'Plot 18, Neeladri Road, Electronic City Phase 1, Bengaluru - 560100',
    ownerName: 'Sudha Venkatesh',
    ownerContact: '+91 98450 77112',
    ownerEmail: 'sudha.v@siliconhostels.org',
    landmark: 'Behind Wipro Gate 5, Near Neeladri High Street',
    nearbyUniversity: 'Christ (Deemed to be University) & St. John’s Medical',
    distanceToUniversity: '15 mins via college bus / shuttle',
    distanceToMetro: 'Electronic City Elevated Metro (5 mins)',
    latitude: 12.8399,
    longitude: 77.6770,
    rentMonthly: 7800,
    depositAmount: 10000,
    foodIncluded: true,
    roomType: 'Triple Sharing Economy with Attached Bath',
    sharingType: 'triple',
    availableRooms: 4,
    availableBeds: 8,
    virtualTourAvailable: true,
    mealOptions: ['South Indian Breakfast', 'Packed Lunch Box', 'Filter Coffee & Snacks', 'Light Dinner with Rice & Sambar'],
    createdAt: '2026-10-12',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 150,
      foodHygieneAuditScore: 96,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Triple Sharing Dorm',
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
        description: 'Clean triple sharing room with individual wardrobes and natural lighting.',
        dimensions: '18 ft × 14 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (150 Mbps)',
      '3 Daily South & North Indian Meals',
      '24/7 CCTV & Female Security Warden',
      'Power Backup for Fans & Lights',
      'Solar Heated Water Supply',
      'Laundromat with Drying Balcony',
      'Quiet Reading Lounge'
    ],
    isColinCertified: false,
    verificationStatus: 'inspection_scheduled',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.78,
    reviewsCount: 35,
    featuredImage: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Few Beds Left',
    description: 'An affordable, secure, and disciplined student hostel for female students and engineering interns in South Bengaluru. Clean rooms, nutritious dining, and round-the-clock female warden supervision.',
    highlights: [
      'Extremely economical with 3 daily home-style meals included',
      'Parental digital gate pass system',
      'Safe neighborhood with regular bus connectivity'
    ],
    houseRules: [
      'Hostel gate closes at 9:00 PM',
      'Visitors strictly in reception lounge',
      'Quiet hours maintained after 10 PM'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-11',
    title: 'Indirapuram Studio Stay — Private Rental Room',
    category: 'rental-room',
    categoryLabel: 'Rental Room',
    gender: 'unisex',
    city: 'Delhi NCR',
    neighborhood: 'Sector 62 / Indirapuram, Noida Border',
    fullAddress: 'C-44, Ahinsa Khand 2, Indirapuram, Ghaziabad / Noida Border - 201014',
    ownerName: 'Sanjay Rastogi',
    ownerContact: '+91 99100 88231',
    ownerEmail: 'sanjay.rastogi@studiospaces.in',
    landmark: 'Near Shipra Mall / 5 mins to Noida Electronic City Metro',
    nearbyUniversity: 'Amity University, Noida',
    distanceToUniversity: '12 mins drive to Amity Campus / Jaypee Institute',
    distanceToMetro: 'Noida Electronic City Metro (Blue Line) - 5 mins',
    latitude: 28.6369,
    longitude: 77.3695,
    rentMonthly: 9000,
    depositAmount: 12000,
    foodIncluded: false,
    roomType: 'Independent Studio Room with Pantry & Balcony',
    sharingType: 'single',
    availableRooms: 2,
    availableBeds: 2,
    virtualTourAvailable: true,
    createdAt: '2026-10-20',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: false,
      wifiSpeedMbps: 200,
      foodHygieneAuditScore: 92,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Private Studio Space',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        description: 'Independent studio with kitchenette and private entrance.',
        dimensions: '15 ft × 12 ft'
      }
    ],
    amenities: [
      'High-Speed Wi-Fi (200 Mbps)',
      'Split Air Conditioning',
      'Kitchenette with Induction Cooktop & Refrigerator',
      'Attached Modern Bathroom with Geyser',
      'Private Balcony with Green Park View',
      'Power Backup 24/7'
    ],
    isColinCertified: false,
    verificationStatus: 'not_requested',
    inspectionRequested: false,
    inspectionPaid: false,
    inspectionCompleted: false,
    inspectionApproved: false,
    rating: 4.74,
    reviewsCount: 14,
    featuredImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Available Now',
    occupancyStatus: 'Available',
    description: 'A quiet, well-ventilated independent studio with private entrance and personal pantry. Perfect for engineering students or university researchers needing distraction-free private study space.',
    highlights: [
      'Complete privacy with private key and direct entry',
      'Close to Noida Blue Line Metro and IT hub',
      'Zero broker commission guaranteed by COLIN'
    ],
    houseRules: [
      'Self-maintained kitchenette cleanliness',
      'No loud parties after 10 PM',
      'Valid student ID required for verification'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  },
  {
    id: 'prop-12',
    title: 'Kota Prerna Girls PG & Study Suites — Coral Park',
    category: 'pg',
    categoryLabel: 'Aspirant PG',
    gender: 'girls',
    city: 'Kota',
    neighborhood: 'Coral Park, Baran Road',
    fullAddress: 'Plot 55, Sector A, Coral Park, Near Resonance CG Tower, Kota - 324005',
    ownerName: 'Dr. Anita Choudhary',
    ownerContact: '+91 94142 66321',
    ownerEmail: 'prerna.pg@kotastudy.in',
    landmark: 'Behind Resonance CG Tower / 400m from Allen SUPATH',
    nearbyUniversity: 'Allen Career Institute, Resonance & Career Point',
    distanceToUniversity: '5 mins walk to Allen SUPATH & Resonance',
    distanceToMetro: 'Kota Junction (20 mins)',
    latitude: 25.1633,
    longitude: 75.8711,
    rentMonthly: 10500,
    depositAmount: 12000,
    foodIncluded: true,
    roomType: 'Single Study Suite with Air Conditioning',
    sharingType: 'single',
    availableRooms: 3,
    availableBeds: 3,
    virtualTourAvailable: true,
    mealOptions: ['Light Nutritious Breakfast', 'Steamed Warm Lunch', 'Fruit & Milk Break', 'Ayurvedic Digestible Dinner'],
    createdAt: '2026-10-22',
    inspectionChecklist: {
      fireSafetyApproved: true,
      biometricSecurityActive: true,
      wifiSpeedMbps: 100,
      foodHygieneAuditScore: 98,
      cleanLinenCertified: true,
      roomVentilationPassed: true
    },
    tourAreas: [
      {
        id: 'bedroom',
        name: 'Single Study Suite',
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        description: 'Single room tailored for NEET aspirants with specialized study table and high-lux LED lighting.',
        dimensions: '14 ft × 11 ft'
      }
    ],
    amenities: [
      'Specialized Study High-Speed Wi-Fi',
      '4 Meals Daily (Nutritionist Approved)',
      'Split AC with Automatic Power Cut Safeguards',
      '24/7 Female Warden & CCTV Security',
      'Biometric Entry & Instant Parent Gate SMS',
      'Ergonomic High-Back Study Chair & Large Table',
      'Laundry Service 3 Times a Week'
    ],
    isColinCertified: false,
    verificationStatus: 'inspection_completed',
    inspectionRequested: true,
    inspectionPaid: true,
    inspectionCompleted: true,
    inspectionApproved: false,
    rating: 4.92,
    reviewsCount: 48,
    featuredImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    ],
    availableFrom: 'Immediate Move-in',
    occupancyStatus: 'Few Beds Left',
    description: 'Designed under medical supervision for female competitive exam aspirants. Strict noise control, ergonomic study furniture, balanced nutrition, and emotional safety.',
    highlights: [
      'Curated for serious NEET & JEE medical/engineering aspirants',
      'Zero brokerage with full 55% visit refund policy',
      'In-house female warden and medical first-aid room'
    ],
    houseRules: [
      'Compulsory silence in academic wings after 9:30 PM',
      'Parental confirmation required for night leaves',
      'Strictly non-smoking premise'
    ],
    visitSlotFee: 150,
    refundGuaranteePercent: 55,
    isSponsored: false
  }
];

export const WHY_COLIN_FEATURES = [
  {
    icon: 'ShieldCheck',
    title: '100% In-Person Verified',
    subtitle: 'COLIN Certified Badge',
    description: 'Every single listed accommodation is physically inspected by our trained campus ambassadors. We verify actual room dimensions, Wi-Fi speeds, hygienic food standards, and security before granting the certified badge.',
    badge: 'Zero Fake Photos'
  },
  {
    icon: 'BadgePercent',
    title: 'Zero Brokerage Direct Deals',
    subtitle: 'Save ₹10,000–₹25,000 Every Year',
    description: 'Say goodbye to greedy local brokers and hidden charges. Connect directly with verified property owners and student living managers with 100% transparent agreements.',
    badge: '100% Transparent'
  },
  {
    icon: 'CalendarCheck2',
    title: 'Guaranteed Slot Booking',
    subtitle: 'With 55% Refund Protection',
    description: 'Book an in-person guided visit slot. If you decide the accommodation is not your right fit after your visit, you receive an instant 55% refund with zero questions asked.',
    badge: 'Fair Policy'
  },
  {
    icon: 'Users',
    title: 'Verified Student Community',
    subtitle: 'Match With Like-Minded Peers',
    description: 'Join a trusted community of scholars from your own university or field of study. Experience study lounges, campus ride shares, and peer networking.',
    badge: 'Student First'
  }
];

export const HOW_COLIN_WORKS_STEPS = [
  {
    step: '01',
    title: 'Discover & Filter Near Campus',
    description: 'Browse verified PGs, student hostels, and co-living spaces by college proximity, gender preference, budget, and meal options.',
    icon: 'Search'
  },
  {
    step: '02',
    title: 'Book a Guided Visit Slot',
    description: 'Reserve an inspection slot directly on the platform. Meet the COLIN campus volunteer or verified owner with full 55% refund assurance.',
    icon: 'Calendar'
  },
  {
    step: '03',
    title: 'Lock In & Move In Hassle-Free',
    description: 'Finalize your room with digital verification, transparent security deposit terms, and zero broker markups.',
    icon: 'CheckCircle'
  }
];

export const TESTIMONIALS = [
  {
    quote: "Finding a PG near North Campus used to mean getting scammed by brokers on WhatsApp. With COLIN, I booked a slot at COLIN Heights, visited in person, and what I saw matched the photos 100%. Best student housing platform ever!",
    author: "Aarav Mehra",
    university: "Shri Ram College of Commerce (SRCC), DU",
    course: "B.Com (Hons)",
    stay: "COLIN Heights, Hudson Lane",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80"
  },
  {
    quote: "As a girl moving from Jaipur to Delhi for South Campus, safety was my parents' #1 priority. Grace Residency had biometric entry, a female warden, and the COLIN Certified report gave my parents total confidence.",
    author: "Ananya Sharma",
    university: "Sri Venkateswara College, DU",
    course: "B.A. Economics",
    stay: "Grace Residency, Satya Niketan",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"
  },
  {
    quote: "The slot booking with the 55% refund guarantee shows COLIN actually cares about students. I checked two places, picked the Koramangala co-living spot, and got moved in within 24 hours.",
    author: "Rohan Nair",
    university: "Christ (Deemed to be University), Bengaluru",
    course: "BCA & AI Specialization",
    stay: "The Scholar Hub, Koramangala",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
  }
];

// Phase 2 Structured Services & Monetization Data
export const COLIN_LIVING_SERVICES: LivingService[] = [
  {
    id: 'srv-laundry',
    title: 'Express Campus Wash & Steam Iron',
    category: 'laundry',
    categoryLabel: 'Laundry Care',
    description: 'Weekly doorstep pickup and delivery of student apparel. Includes antiseptic wash, steam ironing, and fold with a guaranteed 24-hour turnaround.',
    priceIndicative: '₹499 / month (30 clothes)',
    priceNumber: 499,
    partnerName: 'TumbleWash Campus Partners (Demo)',
    partnerRating: 4.8,
    partnerReviews: 120,
    availability: 'Available Daily (8 AM – 8 PM)',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80',
    features: ['Free Doorstep Pickup', 'Antiseptic Fabric Softener', '24h Delivery Guarantee', 'Lost Clothes Insurance'],
    isPopular: true
  },
  {
    id: 'srv-cleaning',
    title: 'Room Deep Sanitization & Dusting',
    category: 'cleaning',
    categoryLabel: 'Deep Cleaning',
    description: 'Professional bi-weekly deep sanitization of your student room, ensuite bathroom scrubbing, floor scrubbing, and mattress UV sanitization.',
    priceIndicative: '₹349 / session',
    priceNumber: 349,
    partnerName: 'CleanNest Student Squad (Demo)',
    partnerRating: 4.9,
    partnerReviews: 84,
    availability: 'Book 24 Hours in Advance',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    features: ['Hospital-Grade Disinfectants', 'Bathroom Descaling', 'Mattress UV Sanitizer', 'Vetted & Verified Staff'],
    isPopular: true
  },
  {
    id: 'srv-transit',
    title: 'Campus & Metro E-Shuttle Pass',
    category: 'transport',
    categoryLabel: 'Transportation',
    description: 'Unlimited electric scooter and shuttle ride-sharing between your accommodation, metro station, and college campus gates.',
    priceIndicative: '₹699 / month pass',
    priceNumber: 699,
    partnerName: 'GreenGlide Campus E-Mobility (Demo)',
    partnerRating: 4.7,
    partnerReviews: 210,
    availability: 'Continuous Service (7 AM – 9 PM)',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
    features: ['Zero Carbon Emission', 'Reserved Student Slots', 'Live GPS Tracking in App', 'Helmet & Safety Gear Included']
  },
  {
    id: 'srv-internet',
    title: 'High-Speed Wi-Fi Boost & Gaming Mesh',
    category: 'internet',
    categoryLabel: 'Broadband Boost',
    description: 'Personalized dual-band Wi-Fi 6 mesh extender installed in your room for zero packet loss during code compilation, exam submissions, and video calls.',
    priceIndicative: '₹299 / month add-on',
    priceNumber: 299,
    partnerName: 'HyperFiber Student Net (Demo)',
    partnerRating: 4.9,
    partnerReviews: 156,
    availability: 'Same-day technician setup',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
    features: ['Up to 500 Mbps Low Latency', 'Zero Dead Zones Guarantee', 'Free Mesh Router Rental', '24/7 Priority Tech Support']
  },
  {
    id: 'srv-repairs',
    title: 'Handyman, AC & Electrical Repairs',
    category: 'repairs',
    categoryLabel: 'Repairs & Fixes',
    description: 'On-demand verified electrician, plumber, and AC technician for quick fixes in your student room or apartment.',
    priceIndicative: '₹149 service call charge',
    priceNumber: 149,
    partnerName: 'FixItFast Verified Techs (Demo)',
    partnerRating: 4.6,
    partnerReviews: 92,
    availability: 'Within 90 mins response time',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    features: ['Background Verified Tradesmen', '30-Day Service Warranty', 'Standardized Component Pricing', 'Emergency Night Call Support']
  },
  {
    id: 'srv-moving',
    title: 'Hostel Shift & Luggage Relocation',
    category: 'moving',
    categoryLabel: 'Moving Assistance',
    description: 'Luggage transport from airport/railway station or moving between PGs. Includes carton boxes, bubble wrap, and mini-truck logistics.',
    priceIndicative: '₹999 / trip (Up to 3 bags + trunk)',
    priceNumber: 999,
    partnerName: 'StudentMovers Express (Demo)',
    partnerRating: 4.8,
    partnerReviews: 63,
    availability: 'Available on all days',
    image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=600&q=80',
    features: ['Sturdy Packing Boxes Included', 'Porter Assistance on Stairs', 'Damage Transit Protection', 'Live Van Location Tracking']
  }
];

export const TIFFIN_MEAL_PLANS = [
  {
    id: 'tiffin-full',
    title: 'Full Board Scholar Plan',
    subtitle: 'All 3 Daily Meals + Evening Chai',
    priceMonthly: 5499,
    mealsIncluded: ['Breakfast (7:30 AM - 8:30 AM)', 'Packed Lunch (12:30 PM - 1:30 PM)', 'Evening Chai & Snacks (5:00 PM)', 'Dinner Buffet (8:00 PM - 9:30 PM)'],
    description: 'Complete nutritional coverage crafted for students living away from home. Daily rotational menu with hot chapatis, fresh dal, paneer/egg curry, seasonal veggies, and rice.',
    tag: 'Most Popular',
    dietaryOptions: ['Pure Vegetarian', 'Eggetarian', 'Non-Vegetarian'],
    sampleMenu: {
      breakfast: 'Poha with Sev / Stuffed Aloo Paratha with Curd / Idli Sambar',
      lunch: 'Dal Makhani, Seasonal Sabzi, 4 Butter Phulkas, Jeera Rice, Salad',
      dinner: 'Shahi Paneer / Chicken Masala, Tadka Dal, 4 Phulkas, Rice, Kheer'
    },
    hygieneRating: 4.9,
    partnerName: 'Annapurna Student Cloud Kitchen (Demo Partner)'
  },
  {
    id: 'tiffin-combo',
    title: 'Campus Lunch & Dinner Combo',
    subtitle: 'Lunch at College + Warm Dinner',
    priceMonthly: 4299,
    mealsIncluded: ['Delivered Lunch (12:30 PM)', 'Warm Dinner (8:15 PM)'],
    description: 'Perfect for scholars who grab a quick breakfast on the way to lectures. Freshly cooked, low-oil, low-spice meals that feel just like home.',
    tag: 'Best Value',
    dietaryOptions: ['Pure Vegetarian', 'Non-Vegetarian', 'Jain Option Available'],
    sampleMenu: {
      lunch: 'Rajma Masala, Aloo Gobi, Steamed Basmati Rice, 3 Phulkas, Pickle',
      dinner: 'Yellow Dal Tadka, Kadai Paneer, 4 Soft Phulkas, Gulab Jamun'
    },
    hygieneRating: 4.8,
    partnerName: 'Maa Ki Rasoi Tiffin Hub (Demo Partner)'
  },
  {
    id: 'tiffin-dinner',
    title: 'Evening Dinner Only Plan',
    subtitle: 'Fresh Home-style Dinner Every Night',
    priceMonthly: 2799,
    mealsIncluded: ['Warm Dinner Delivery (7:45 PM - 9:00 PM)'],
    description: 'Designed for students who eat breakfast and lunch near campus canteens and want a guaranteed healthy, piping-hot home meal after long study hours.',
    tag: 'Budget Friendly',
    dietaryOptions: ['Pure Vegetarian', 'Eggetarian'],
    sampleMenu: {
      dinner: 'Paneer Butter Masala / Egg Curry, Chana Dal, 4 Phulkas, Rice, Fresh Curd'
    },
    hygieneRating: 4.85,
    partnerName: 'DesiZaika Student Kitchen (Demo Partner)'
  }
];

export const STUDENT_PREMIUM_TIERS = [
  {
    id: '7-day' as const,
    name: '7-Day Fast Placement Pass',
    durationLabel: '7 Days Access',
    price: 499,
    tag: 'Urgent Search',
    description: 'Ideal if you have arrived in town and need a confirmed, certified room within the week.',
    benefits: [
      '1-on-1 Dedicated Student Accommodation Partner on WhatsApp',
      'Curated shortlist of 5 top matches within 4 hours',
      'Priority visit scheduling with landlord fast-track',
      'Direct phone access to property owners without queues',
      'Emergency room matching guarantee'
    ]
  },
  {
    id: '15-day' as const,
    name: '15-Day Semester Placement Pro',
    durationLabel: '15 Days Access',
    price: 899,
    tag: 'Recommended',
    description: 'The standard choice for students joining new colleges, searching from another city.',
    benefits: [
      'Dedicated Campus Living Advisor throughout your search',
      'Early access to newly verified off-market student rooms',
      'Video inspection verification request on demand',
      'Lease agreement verification to protect against hidden charges',
      'Discount voucher on COLIN Living laundry & moving services',
      'Zero brokerage guarantee assistance'
    ]
  },
  {
    id: '30-day' as const,
    name: '30-Day VIP Campus Living Partner',
    durationLabel: '30 Days Access',
    price: 1499,
    tag: 'Maximum Peace of Mind',
    description: 'Complete end-to-end relocation concierge from search to physical move-in.',
    benefits: [
      'Personal relocation concierge assigned to student & parents',
      'Unlimited owner direct phone contacts & priority visit passes',
      'Physical luggage transfer assistance discount (₹500 off)',
      'Free 1-week TiffinConnect meal trial coupon',
      'Roommate matching with verified scholars of your university',
      'Parental peace of mind verification pack'
    ]
  }
];

export const INITIAL_STUDENT_VISITS: VisitBooking[] = [
  {
    id: 'VSLOT-842910',
    bookingReference: 'COLIN-VIS-2026-0001',
    propertyId: 'prop-1',
    propertyTitle: 'COLIN Heights — Premium Student PG',
    propertyCity: 'Delhi NCR',
    propertyNeighborhood: 'Hudson Lane, North Campus',
    propertyImage: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
    date: 'Tomorrow, Nov 2',
    timeSlot: '11:30 AM - 01:00 PM',
    studentName: 'Aarav Mehra',
    studentPhone: '+91 98765 43210',
    studentAge: 20,
    roomTypeInterested: 'Double Sharing Room with Balcony',
    status: 'Confirmed',
    feePaid: 150,
    refundPolicy: '55% guaranteed refund (₹82.50) if you do not proceed after inspecting the stay in person.',
    meetingGuideName: 'Tanya Kapoor (DU Student Ambassador)',
    meetingGuideContact: '+91 98112 00192',
    createdAt: '2026-11-01',
    assignedVolunteer: {
      id: 'VOL-882',
      name: 'Tanya Kapoor',
      role: 'DU Student Ambassador',
      phone: '+91 98112 00192',
      assignedAt: '2026-11-01T10:00:00.000Z',
    },
  },
  {
    id: 'VSLOT-512039',
    bookingReference: 'COLIN-VIS-2026-0002',
    propertyId: 'prop-2',
    propertyTitle: 'Grace Residency — Girls Luxury PG & Co-living',
    propertyCity: 'Delhi NCR',
    propertyNeighborhood: 'Satya Niketan, South Campus',
    propertyImage: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80',
    date: 'Wednesday, Nov 4',
    timeSlot: '02:30 PM - 04:00 PM',
    studentName: 'Aarav Mehra',
    studentPhone: '+91 98765 43210',
    studentAge: 20,
    roomTypeInterested: 'Single Ensuite Room',
    status: 'Confirmed',
    feePaid: 150,
    refundPolicy: '55% guaranteed refund (₹82.50) if you do not proceed after inspecting the stay in person.',
    meetingGuideName: 'Kunal Singhania (COLIN Guide)',
    meetingGuideContact: '+91 98104 55120',
    createdAt: '2026-10-31',
    assignedVolunteer: {
      id: 'VOL-883',
      name: 'Kunal Singhania',
      role: 'COLIN Guide',
      phone: '+91 98104 55120',
      assignedAt: '2026-10-31T14:00:00.000Z',
    },
  }
];
