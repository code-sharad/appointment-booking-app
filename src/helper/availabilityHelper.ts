export const exampleAvailabilityData = [
  // Monday - Available 9:00 AM to 5:00 PM
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 1, // Monday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Tuesday - Available 9:00 AM to 5:00 PM
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 2, // Tuesday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Wednesday - Available 9:00 AM to 5:00 PM
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 3, // Wednesday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Thursday - Available 9:00 AM to 5:00 PM
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 4, // Thursday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Friday - Available 9:00 AM to 5:00 PM
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 5, // Friday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Saturday - Not available (isAvailable: false)
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 6, // Saturday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: false, // Disabled like in the Cal.ai UI
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  // Sunday - Not available (isAvailable: false)
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    sellerId: "550e8400-e29b-41d4-a716-446655440000",
    dayOfWeek: 0, // Sunday
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: false, // Disabled like in the Cal.ai UI
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  }
];


// Helper functions to work with this data

export const AvailabilityHelpers = {
  // Day of week mapping
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  // Convert database format to UI format
  formatForUI: (availabilityData: typeof exampleAvailabilityData) => {
    return availabilityData.map(item => ({
      id: item.id,
      dayOfWeek: item.dayOfWeek,
      dayName: AvailabilityHelpers.dayNames[item.dayOfWeek],
      startTime: item.startTime,
      endTime: item.endTime,
      isAvailable: item.isAvailable,
      // Convert to 12-hour format for display
      startTimeDisplay: AvailabilityHelpers.convertTo12Hour(item.startTime),
      endTimeDisplay: AvailabilityHelpers.convertTo12Hour(item.endTime),
    }));
  },

  // Convert 24-hour to 12-hour format
  convertTo12Hour: (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${period}`;
  },

  // Convert 12-hour to 24-hour format
  convertTo24Hour: (time12: string) => {
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  },

  // Generate default availability (Mon-Fri 9AM-5PM)
  generateDefaultAvailability: (sellerId: string) => {
    const defaultHours = [
      { day: 0, available: false }, // Sunday
      { day: 1, available: true },  // Monday
      { day: 2, available: true },  // Tuesday
      { day: 3, available: true },  // Wednesday
      { day: 4, available: true },  // Thursday
      { day: 5, available: true },  // Friday
      { day: 6, available: false }, // Saturday
    ];

    return defaultHours.map(({ day, available }) => ({
      sellerId,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: available,
    }));
  },
};
