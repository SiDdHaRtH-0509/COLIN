import { Property } from '../types';

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
    rentMonthly: 12500,
    depositAmount: 12500,
    foodIncluded: true,
    roomType: 'Double Sharing with Attached Balcony & Bath',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 14000,
    depositAmount: 14000,
    foodIncluded: true,
    roomType: 'Twin Sharing Deluxe with Ensuite Bathroom',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 16500,
    depositAmount: 20000,
    foodIncluded: false,
    roomType: 'Private Studio or Twin Pod Sharing',
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
    isColinCertified: true,
    certificationScore: 97,
    certificationDate: '05 October 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 11500,
    depositAmount: 15000,
    foodIncluded: true,
    roomType: 'Triple or Double Sharing Room with Balcony',
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
    isColinCertified: true,
    certificationScore: 96,
    certificationDate: '24 September 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 15500,
    depositAmount: 30000,
    foodIncluded: false,
    roomType: 'Private Room in Furnished 2BHK',
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
    certificationScore: 95,
    certificationDate: '01 October 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 9800,
    depositAmount: 10000,
    foodIncluded: true,
    roomType: 'Single Study Room with Large Desk & Bookshelf',
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
    certificationScore: 99,
    certificationDate: '28 October 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 13500,
    depositAmount: 15000,
    foodIncluded: true,
    roomType: 'Twin Sharing or Private Pod',
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
    isColinCertified: true,
    certificationScore: 97,
    certificationDate: '15 October 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
    rentMonthly: 8500,
    depositAmount: 12000,
    foodIncluded: false,
    roomType: 'Private Independent Room with Attached Bath',
    amenities: [
      'High-Speed Wi-Fi (100 Mbps)',
      'Independent Private Entrance with Key',
      'Attached Clean Western Bathroom & Geyser',
      'Wardrobe, Study Table & Chair Provided',
      'Water Filter & Drinking Water Access',
      'Quiet Residential Green Neighborhood',
      'Two-Wheeler Covered Parking Spot'
    ],
    isColinCertified: true,
    certificationScore: 94,
    certificationDate: '08 October 2026',
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
    visitSlotFee: 299,
    refundGuaranteePercent: 55
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
