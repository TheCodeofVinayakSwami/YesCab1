document.addEventListener('DOMContentLoaded', function() {
  console.log('script.js loaded');

  // Helper function to safely get field value
  const getField = (selector, ctx = document) => {
    const el = ctx.querySelector(selector);
    return el ? el.value.trim() : '';
  };

  // ===== TAB SWITCHING =====
  const tabs = document.querySelectorAll('.service-tab');
  const forms = {
    daily: document.getElementById('dailyForm'),
    airport: document.getElementById('airportForm'),
    oneway: document.getElementById('onewayForm')
  };
  
  tabs.forEach(tab => {
    tab.onclick = function() {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.keys(forms).forEach(key => {
        if (forms[key]) forms[key].style.display = (tab.dataset.tab === key) ? 'flex' : 'none';
      });
    };
  });

  // ===== DAILY CAB - SEATS TO AMOUNT =====
  document.getElementById('seats')?.addEventListener('change', function() {
    const seats = parseInt(this.value, 10);
    const amount = seats ? 600 * seats : '';
    document.getElementById('amount').value = amount ? amount + ' ₹' : '';
  });

  // ===== DAILY CAB - SUB-POINTS (PICK/DROP) =====
  const subPoints = {
    "Kolhapur": {
      from: ["Talawar Chowk", "Gokale College", "CBS Stand", "Tawade Hotel"],
      to: ["Talawar Chowk", "Gokale College", "CBS Stand", "Tawade Hotel"]
    },
    "Pune": {
      from: ["Navle Bridge", "Chandani Chowk", "Wakad Bridge", "Katarj Chowk", "Swargate Chowk", "Pune Station"],
      to: ["Navle Bridge", "Chandani Chowk", "Wakad Bridge", "Katarj Chowk", "Swargate Chowk", "Pune Station"]
    }
  };

  // Handle "From City" selection
  const fromCitySelect = document.getElementById('fromCity');
  if (fromCitySelect) {
    fromCitySelect.addEventListener('change', function() {
      const city = this.value;
      const fromPointDiv = document.getElementById('fromPointDiv');
      const fromPointSelect = document.getElementById('fromPoint');

      if (city && subPoints[city]) {
        fromPointSelect.innerHTML = '<option value="" selected disabled>Select Pick Point</option>';
        subPoints[city].from.forEach(point => {
          const opt = document.createElement('option');
          opt.value = point;
          opt.textContent = point;
          fromPointSelect.appendChild(opt);
        });
        if (fromPointDiv) fromPointDiv.style.display = 'block';
      } else {
        if (fromPointDiv) fromPointDiv.style.display = 'none';
        if (fromPointSelect) fromPointSelect.innerHTML = '';
      }
      
      // Update time options
      updateTimeOptions();
    });
  }

  // Handle "To City" selection
  const toCitySelect = document.getElementById('toCity');
  if (toCitySelect) {
    toCitySelect.addEventListener('change', function() {
      const city = this.value;
      const toPointDiv = document.getElementById('toPointDiv');
      const toPointSelect = document.getElementById('toPoint');

      if (city && subPoints[city]) {
        toPointSelect.innerHTML = '<option value="" selected disabled>Select Drop Point</option>';
        subPoints[city].to.forEach(point => {
          const opt = document.createElement('option');
          opt.value = point;
          opt.textContent = point;
          toPointSelect.appendChild(opt);
        });
        if (toPointDiv) toPointDiv.style.display = 'block';
      } else {
        if (toPointDiv) toPointDiv.style.display = 'none';
        if (toPointSelect) toPointSelect.innerHTML = '';
      }
      
      // Update time options
      updateTimeOptions();
    });
  }

  // ===== DAILY CAB - TIME OPTIONS =====
  const timeOptions = {
    "Kolhapur-Pune": [
      { value: "05:00", label: "5:00 AM" },
      { value: "07:00", label: "7:00 AM" },
      { value: "15:00", label: "3:00 PM" }
    ],
    "Pune-Kolhapur": [
      { value: "12:30", label: "12:30 PM" },
      { value: "16:00", label: "4:00 PM" },
      { value: "21:00", label: "9:00 PM" }
    ]
  };

  function updateTimeOptions() {
    const from = getField('#fromCity');
    const to = getField('#toCity');
    const timeSelect = document.getElementById('journeyTime');
    if (!timeSelect) return;
    
    timeSelect.innerHTML = '<option value="" selected disabled>Select Time</option>';
    const key = from + "-" + to;
    (timeOptions[key] || []).forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      timeSelect.appendChild(option);
    });
  }

  if (fromCitySelect) fromCitySelect.addEventListener('change', updateTimeOptions);
  if (toCitySelect) toCitySelect.addEventListener('change', updateTimeOptions);

  // ===== AIRPORT - PRICING =====
  const airportPricing = {
    "Kolhapur-Pune": { "Ertiga": 5000, "Innova": 7000, "Swift": 3800 },
    "Kolhapur-Mumbai": { "Ertiga": 8500, "Innova": 11000, "Swift": 6000 },
    "Pune-Kolhapur": { "Ertiga": 5000, "Innova": 7000, "Swift": 3800 },
    "Mumbai-Kolhapur": { "Ertiga": 8500, "Innova": 11000, "Swift": 6000 },
    "Kolhapur-Belgav": { "Ertiga": 4500, "Innova": 5500, "Swift": 3500 },
    "Belgav-Kolhapur": { "Ertiga": 4500, "Innova": 5500, "Swift": 3500 },
    "Kolhapur-Bengaluru": { "Ertiga": 12500, "Innova": 14000, "Swift": 10500 },
    "Bengaluru-Kolhapur": { "Ertiga": 12500, "Innova": 14000, "Swift": 10500 }
    
  };

  function calcAirportAmount() {
    const pickup = getField('#airportPickup');
    const drop = getField('#airportDrop');
    const car = getField('#airportCar');
    const key = pickup + "-" + drop;
    const amount = (airportPricing[key] && airportPricing[key][car]) ? airportPricing[key][car] : 0;
    const amountEl = document.getElementById('airportAmount');
    if (amountEl) {
      amountEl.value = amount ? amount + " ₹" : '';
    }
  }

  const airportPickup = document.getElementById('airportPickup');
  const airportDrop = document.getElementById('airportDrop');
  const airportCar = document.getElementById('airportCar');

  if (airportPickup) airportPickup.addEventListener('change', calcAirportAmount);
  if (airportDrop) airportDrop.addEventListener('change', calcAirportAmount);
  if (airportCar) airportCar.addEventListener('change', calcAirportAmount);

  // ===== ONE WAY - PRICING =====
  const onewayPricing = {
    "Kolhapur-Pune": { "Ertiga": 4500, "Innova": 7000, "Swift": 3600 },
    "Kolhapur-Mumbai & Thane": { "Ertiga": 9000, "Innova": 11000, "Swift": 7500 },
    "Kolhapur-Belgav": { "Ertiga": 3000, "Innova": 4500, "Swift": 2500 },
    "Kolhapur-Goa": { "Ertiga": 7000, "Innova": 4500, "Swift": 5500 },
    "Kolhapur-Bengaluru": { "Ertiga": 12500, "Innova": 14000, "Swift": 10500 }

  };

  function calcOnewayAmount() {
    const from = getField('#onewayFrom');
    const to = getField('#onewayTo');
    const car = getField('#onewayCar');
    const key = from + "-" + to;
    const amount = (onewayPricing[key] && onewayPricing[key][car]) ? onewayPricing[key][car] : 0;
    const amountEl = document.getElementById('onewayAmount');
    if (amountEl) {
      amountEl.value = amount ? amount + " ₹" : '';
    }
  }

  const onewayFrom = document.getElementById('onewayFrom');
  const onewayTo = document.getElementById('onewayTo');
  const onewayCar = document.getElementById('onewayCar');

  if (onewayFrom) onewayFrom.addEventListener('change', calcOnewayAmount);
  if (onewayTo) onewayTo.addEventListener('change', calcOnewayAmount);
  if (onewayCar) onewayCar.addEventListener('change', calcOnewayAmount);

  // ===== SET MINIMUM DATE (TOMORROW) =====
  function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
      input.setAttribute('min', minDateStr);
    });
  }
  setMinDate();

  // ===== BOOK NOW BUTTON - REDIRECT TO BOOKING PAGE =====
  document.querySelectorAll('.goto-booking').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const service = btn.dataset.service || (document.querySelector('.service-tab.active')?.dataset.tab || 'daily');

      let params = new URLSearchParams();
      params.set('service', service);

      if (service === 'daily') {
        const from = getField('#fromCity');
        const fromPoint = getField('#fromPoint');
        const to = getField('#toCity');
        const toPoint = getField('#toPoint');
        const date = getField('#dailyForm input[type="date"]');
        const time = getField('#journeyTime');
        const seats = getField('#seats');
        const amount = getField('#amount').replace(/[^0-9.]/g, '');

        if (!from || !fromPoint || !to || !toPoint || !date || !time || !seats) {
          alert('Please fill all fields (From, Pick Point, To, Drop Point, Date, Time, Seats)');
          return;
        }

        if (from) params.set('from', from);
        if (fromPoint) params.set('from_point', fromPoint);
        if (to) params.set('to', to);
        if (toPoint) params.set('to_point', toPoint);
        if (date) params.set('date', date);
        if (time) params.set('time', time);
        if (seats) params.set('seats', seats);
        if (amount) params.set('amount', amount);
      }

      if (service === 'airport') {
        const pickup = getField('#airportPickup');
        const drop = getField('#airportDrop');
        const car = getField('#airportCar');
        const date = getField('#airportForm input[type="date"]');
        const amount = getField('#airportAmount').replace(/[^0-9.]/g, '');

        if (!pickup || !drop || !car || !date) {
            alert('Please fill all fields (Pickup, Drop, Car, Date)');
            return;
        }

        if (pickup) params.set('pickupCity', pickup); // Updated to use pickupCity
        if (drop) params.set('dropCity', drop); // Updated to use dropCity
        if (car) params.set('car', car);
        if (date) params.set('date', date);
        if (amount) params.set('amount', amount);
      }

      if (service === 'oneway') {
        const from = getField('#onewayFrom');
        const to = getField('#onewayTo');
        const car = getField('#onewayCar');
        const date = getField('#onewayForm input[type="date"]');
        const amount = getField('#onewayAmount').replace(/[^0-9.]/g, '');

        if (!from || !to || !car || !date) {
          alert('Please fill all fields (From, To, Car, Date)');
          return;
        }

        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (car) params.set('car', car);
        if (date) params.set('date', date);
        if (amount) params.set('amount', amount);
      }

      // Redirect to booking page
      window.location.href = '/booking?' + params.toString();
    });
  });

  // ===== SUMMARY POPULATION SCRIPT =====
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return;

  const service = params.get('service') || '';
  const amount = params.get('amount') ? (params.get('amount') + ' ₹') : '';
  const from = params.get('pickupCity') || params.get('from') || ''; // Updated for Airport
  const fromPoint = params.get('from_point') || '';  // NEW
  const to = params.get('dropCity') || params.get('to') || ''; // Updated for Airport
  const toPoint = params.get('to_point') || '';  // NEW
  const date = params.get('date') || '';
  const time = params.get('time') || '';
  const seats = params.get('seats') || '';

  // Populate summary based on service type
  document.getElementById('s_service').textContent = (service || '').replace(/^\w/, c => c.toUpperCase());
  document.getElementById('s_amount').textContent = amount || '-';
  document.getElementById('s_from').textContent = from || '-';
  document.getElementById('s_from_point').textContent = fromPoint || '-';  // NEW
  document.getElementById('s_to').textContent = to || '-';
  document.getElementById('s_to_point').textContent = toPoint || '-';  // NEW
  document.getElementById('s_date').textContent = date || '-';
  document.getElementById('s_time').textContent = time || '-';
  document.getElementById('s_seats').textContent = seats || '-';

  // Show summary fields if service is valid
  document.getElementById('noData').style.display = 'none';
  document.getElementById('summaryFields').style.display = 'block';
});
