/* Campco chatbot v3.0 - offline smart assistant, ChatGPT-style replies + Discord-style sounds.
   No API key, no server. Works with no internet once the page is loaded (and with sw.js after the first visit).
   Drop-in: <script src="chatbot.js" defer></script>   (+ sw.js next to index.html for full offline use)

   Behaviour
   - You send a question -> "send" sound -> floating dots -> "reply" sound -> the answer types out smoothly
     (click the answer to show it instantly)
   - Sounds are synthesised in code (no files). The bell button mutes them.

   Optional config (define BEFORE loading this script):
     window.CampcoBotConfig = {
       logUrl: 'https://your-server/bot-log',   // receives JSON via sendBeacon: unanswered + feedback
       sounds: { send: 'send.mp3', receive: 'receive.mp3' }, // optional: your own audio files instead of built-in tones
       onEvent: function (type, data) {}         // type: 'unanswered' | 'feedback' | 'open'
     };
   Console tests:  CampcoBot.reply("who was md in 1995")   |   CampcoBot.open()
*/
(function () {
  'use strict';

  var CFG = (typeof window !== 'undefined' && window.CampcoBotConfig) || {};
  var GREEN = '#459545', RED = '#fd4441';
  var SITE = 'https://campco.org';
  var CART = 'https://campcocart.com';
  var DATA_DATE = '16 Oct 2026';
  var PHONE = '0824 2888200', EMAIL = 'info@campco.org';

  /* ================================================================== *
   *  KNOWLEDGE BASE
   *  id | t: short title (used on chips) | k: keywords/phrases
   *  a: answer | l: [[label,url]] | f: follow-up ids | live: time-sensitive
   * ================================================================== */
  var KB = [
    { id: 'about', t: 'About CAMPCO',
      k: ['about campco', 'what is campco', 'who are you', 'about us', 'campco history', 'history', 'established', 'founded', 'when was campco founded', 'registered', 'since when', 'campco story', 'overview', 'tell me about campco', 'cooperative', 'co-operative', 'society', 'timeline'],
      a: `**CAMPCO** (The Central Arecanut and Cocoa Marketing and Processing Co-operative Ltd.) is a farmer-led, multi-state co-operative founded in 1973 in Mangalore.

Arecanut prices fell by roughly half in 1970-71. On an Expert Committee's advice, and with support from the Karnataka and Kerala governments, CAMPCO was registered on 11 July 1973.

It now procures arecanut, cocoa, pepper, rubber and coconut/copra from growers, runs a chocolate factory at Puttur and sells value-added products under the Campco brand.`,
      l: [['About Us', SITE + '/about-us/']], f: ['objectives', 'founder', 'stats'] },

    { id: 'objectives', t: 'Objectives',
      k: ['objectives', 'objective', 'aim', 'aims', 'purpose', 'why was campco formed', 'why campco', 'goals', 'what does campco do'],
      a: `CAMPCO's objectives:
• Procure arecanut and cocoa from member growers (and others where needed) on agency or outright purchase basis
• Sell produce and products to the best advantage of members
• Give advance loans to members against pledged goods
• Promote and develop areca and cocoa cultivation, marketing and processing`,
      l: [['About Us', SITE + '/about-us/']], f: ['about', 'benefit', 'products'] },

    { id: 'founder', t: 'Founder',
      k: ['founder', 'subraya bhat', 'varanashi', 'who started', 'who founded', 'sahakari ratna', 'sahakarita ratna', 'varanashi subraya bhat'],
      a: `**Late Sri Varanashi Subraya Bhat** (born 8 June 1927 near Adyanadka, Karnataka) founded CAMPCO and was its Founder President from 1973 to December 1990.

• Founded the Puttur chocolate factory (1986)
• President, All India Arecanut and Cocoa Growers' Association
• Chairman, Cocoa and Arecanut Development Committee (Ministry of Agriculture)
• Awards: "Sahakari Ratna" (Govt. of Karnataka, 2002) and "Sahakarita Ratna" (IFFCO, 2005)`,
      l: [['About Us', SITE + '/about-us/']], f: ['formerpres', 'factory', 'about'] },

    { id: 'stats', t: 'CAMPCO at a glance',
      k: ['members', 'how many members', 'member count', 'branches', 'how many branches', 'how many factories', 'statistics', 'stats', 'numbers', 'procurement centres', 'procurement centers', 'sales depots', 'depots', 'size', 'how big', 'at a glance'],
      a: `**CAMPCO at a glance**
• 1,50,000+ members
• 1 factory (Puttur)
• 156 branches
• 19 directors
• Arecanut: 118 procurement centres across Karnataka and Kerala (it began with just 5) and 14 sales depots across India`,
      l: [['Home', SITE + '/']], f: ['about', 'areca', 'board'] },

    { id: 'contact', t: 'Contact',
      k: ['contact', 'contact number', 'phone', 'phone number', 'call', 'email', 'email id', 'mail id', 'address', 'head office', 'where is campco', 'location', 'reach you', 'mail', 'customer care', 'helpline', 'helpdesk', 'office', 'toll free', 'get in touch'],
      a: `**The CAMPCO Ltd. - Head Office**
P.B. No. 223, "Varanashi Towers", Mission Street,
Mangalore, Dakshina Kannada, Karnataka - 575001

Phone: 0824 2888200
Email: info@campco.org

Online shop (CAMPCO Cart) help: +91 90355 68442`,
      l: [['Contact Us', SITE + '/contact-us/'], ['Shop contact', CART + '/pages/contact']], f: ['distributor', 'branchloc', 'management'] },

    { id: 'branchloc', t: 'Branches & depots',
      k: ['nearest branch', 'branch near me', 'branch address', 'branch location', 'branch list', 'depot address', 'depot location', 'procurement centre address', 'where is the branch', 'branch contact'],
      a: `CAMPCO has 156 branches, 118 arecanut procurement centres (Karnataka and Kerala) and 14 arecanut sales depots across India.

I don't have individual branch or depot addresses, so for the nearest one please call the Head Office on 0824 2888200 or email info@campco.org. For chocolate sales offices, use the Sales Offices page.`,
      l: [['Contact Us', SITE + '/contact-us/'], ['Sales Offices', CART + '/pages/locate-sales-offices']], f: ['contact', 'stats'] },

    /* ---------------- Products & farm produce ---------------- */
    { id: 'products', t: 'Products',
      k: ['products', 'what do you sell', 'what do you buy', 'what do you deal in', 'commodities', 'commodity', 'crops', 'product list', 'offerings'],
      a: `CAMPCO deals in five core commodities:
• **Areca** (arecanut)
• **Pepper**
• **Cocoa**
• **Rubber**
• **Coconut / Copra**

It also makes chocolates and cocoa products, Campco Calpa coconut oil and Kala Sona black pepper, and sells manures and fertilizers to growers. Tap a topic below or ask me about any of them.`,
      l: [['Products', SITE + '/products/']], f: ['areca', 'cocoa', 'shop', 'manure'] },

    { id: 'areca', t: 'Arecanut',
      k: ['areca', 'arecanut', 'areca nut', 'betel nut', 'supari', 'white supari', 'red supari', 'arecanut varieties', 'adike', 'areca price'],
      a: `Areca (betel nut) is the seed of a berry-class fruit. Two main varieties:
• **White Supari** - ripe nut, sun-dried
• **Red Supari** - tender green nut, husk removed

CAMPCO entered the arecanut market in November 1973 and brought prices back to pre-fall levels. It started with 5 procurement centres and now has 118 (Karnataka and Kerala) plus 14 sales depots across India.

India is the world's largest producer: about 264,000 ha and 313,000 tonnes a year. Karnataka and Kerala give about 72% of output, over 85% is small and marginal holdings, and over 6 million people are engaged in the crop.`,
      l: [['Areca', SITE + '/areca/']], f: ['rates', 'sell', 'pepper'], live: false },

    { id: 'pepper', t: 'Pepper',
      k: ['pepper', 'black pepper', 'kala sona', 'king of spices', 'spice', 'spices', 'spice toffee', 'ginger toffee'],
      a: `Pepper is the "King of Spices". CAMPCO procures and markets pepper, and its value-added product is **Campco Kala Sona** - garbled, graded black pepper.

Campco Chocolates has also launched a "Spice Toffee" made with black pepper and ginger extract.

Kala Sona was listed at Rs. 45 on the online shop when this guide was compiled; please check the shop for the current price and stock.`,
      l: [['Pepper', SITE + '/pepper/'], ['Buy Kala Sona', CART + '/products/kala-sona']], f: ['shop', 'coconut', 'areca'], live: true },

    { id: 'cocoa', t: 'Cocoa',
      k: ['cocoa', 'cacao', 'cocoa beans', 'cocoa powder', 'wet beans', 'cocoa wet', 'dry beans', 'cocoa story', 'cocoa handbook', 'cocoa cultivation'],
      a: `CAMPCO sources cocoa beans from farmers in Karnataka and Kerala.

It promoted cocoa as a supplementary crop in the late 1970s. When buyers withdrew after an international price crash, CAMPCO stepped in, adopted scientific processing and produced dry beans comparable in quality to Ghana and Brazil, helping establish Indian cocoa. To create a steady market, it then built the chocolate factory.

Cocoa goes into ice cream, biscuits, drinking chocolate, fillings, soaps and skincare.`,
      l: [['Cocoa', SITE + '/cocoa/'], ['Cocoa Handbook (PDF)', SITE + '/wp-content/uploads/2022/04/cocoa-handbook.pdf']], f: ['factory', 'sell', 'industrial'] },

    { id: 'rubber', t: 'Rubber',
      k: ['rubber', 'natural rubber', 'rubber trading', 'rubber price'],
      a: `CAMPCO has traded in natural rubber for 10+ years, supporting arecanut growers who took up rubber to boost their income. It procures from parts of Karnataka and Kerala, with collection centres opening in phases.

Natural rubber serves the automobile, electronics, electrical, health care and power transmission industries.`,
      l: [['Rubber', SITE + '/rubber/']], f: ['rates', 'sell', 'products'] },

    { id: 'coconut', t: 'Coconut / Calpa',
      k: ['coconut', 'copra', 'calpa', 'coconut oil', 'campco calpa', 'oil', 'edible oil', 'cooking oil'],
      a: `CAMPCO began purchasing coconut and copra in **September 2023**, offering farmers an assured market, fair prices and timely payment.

Value-added product: **Campco Calpa** coconut oil, made from quality copra bought directly from farmers.
• Pack sizes: 500 ml and 1 L bottles, 500 ml and 1 L pouches, 5 L can
• Listed from Rs. 218 on the online shop (check for the current price)`,
      l: [['Coconut/Copra', SITE + '/coconut-copra/'], ['Buy Calpa', CART + '/products/campco-calpa']], f: ['shop', 'sell', 'pepper'], live: true },

    { id: 'rates', t: 'Procurement rates',
      k: ['rate', 'rates', 'procurement rate', 'market rate', 'today rate', 'todays rate', 'arecanut rate', 'areca rate', 'cocoa rate', 'cocoa price', 'price of arecanut', 'price of cocoa', 'daily price', 'current price', 'mandi', 'buying price', 'support price'],
      a: `Arecanut and cocoa buying rates change daily, so I can't quote them reliably and won't guess.

Please call your nearest CAMPCO branch or the Head Office on 0824 2888200 (or email info@campco.org) for today's rates.`,
      l: [['Contact Us', SITE + '/contact-us/']], f: ['branchloc', 'sell', 'contact'], live: true },

    { id: 'sell', t: 'Sell my produce',
      k: ['sell my arecanut', 'sell arecanut', 'sell cocoa', 'sell my produce', 'how to sell', 'selling', 'procure', 'procurement', 'procurement centres near', 'tender my arecanut', 'supply', 'farmer sell', 'become a member', 'join campco', 'membership', 'how to join', 'enrol', 'register as member', 'new member'],
      a: `CAMPCO buys arecanut, cocoa, pepper, rubber and coconut/copra directly from growers. Arecanut is bought through 118 procurement centres across Karnataka and Kerala; cocoa wet beans are also purchased from farmers.

I don't have the step-by-step enrolment or tendering procedure or current rates, so please contact your nearest branch or the Head Office (0824 2888200 / info@campco.org). Note that "active member" status for benefit schemes needs arecanut tendered continuously over the last 3 financial years (average 1 quintal a year).`,
      l: [['Contact Us', SITE + '/contact-us/'], ['Member Benefit Scheme', SITE + '/member-benefit-scheme/']], f: ['rates', 'branchloc', 'benefit'] },

    /* ---------------- Factory & sustainability ---------------- */
    { id: 'factory', t: 'Chocolate factory',
      k: ['chocolate factory', 'factory', 'puttur', 'kemminje', 'ccf', 'nestle', 'manufacturing', 'plant', 'licensed capacity', 'capacity', 'moulded line', 'count line', 'chocolate drinks'],
      a: `The **CAMPCO Chocolate Factory (CCF)** is at Kemminje village, Puttur Taluk, Dakshina Kannada.
• Established 1986 with foreign collaboration; initial investment Rs. 116.7 million; licensed capacity 880 metric tonnes
• Technical cooperation venture with Nestle (India) Ltd for product diversification
• Semi-finished: cocoa mass, cocoa butter, cocoa powder
• Finished: moulded line, count line, chocolate drinks
• Made under its own brand and for other brands`,
      l: [['The Chocolate Factory', CART + '/pages/the-chocolate-factory']], f: ['visit', 'cert', 'green'] },

    { id: 'visit', t: 'Factory visit',
      k: ['factory visit', 'visit factory', 'industrial visit', 'visit campco', 'tour', 'visit the factory', 'can i visit', 'plant visit', 'school visit', 'student visit'],
      a: `You can arrange a visit to the CAMPCO chocolate factory (Puttur) through the factory-visit page below.`,
      l: [['Visit Campco Factory', CART + '/pages/visit-campco-factory']], f: ['factory', 'contact'] },

    { id: 'cert', t: 'Certifications',
      k: ['iso', 'certification', 'certifications', 'fssc', 'fssc 22000', 'fssai', 'food safety', 'certified', 'iso 14001', 'iso 45001', 'quality standards', 'quality certificate', 'safe'],
      a: `The CAMPCO Chocolate Factory holds:
• **FSSC 22000 (Version 6)** - Food Safety System Certification
• **ISO 14001:2015** - Environmental Management System
• **ISO 45001:2018** - Occupational Health and Safety

It operates with a new Amenity Building to meet international food-safety standards and FSSAI zoning. FSSAI Food Safety Connect app: https://fssai.gov.in/cms/food-safety-connect.php`,
      l: [['About Us', SITE + '/about-us/']], f: ['factory', 'green', 'rating'] },

    { id: 'rating', t: 'Credit rating',
      k: ['credit rating', 'crisil', 'rating', 'bank loan', 'loan rated', 'financial strength', 'a1', 'creditworthy'],
      a: `CAMPCO is rated by **CRISIL**. For 2024-25:
• Total bank loan rated: Rs. 630 Crore
• Long-term rating: A (stable)
• Short-term rating: A1

(The same ratings were published for the previous year as well.)`,
      l: [['About Us', SITE + '/about-us/']], f: ['cert', 'awards', 'stats'] },

    { id: 'green', t: 'Wind & solar energy',
      k: ['windmill', 'windmills', 'solar', 'energy', 'green energy', 'renewable', 'power', 'wind', 'wind energy', 'electricity', 'sustainability', 'sustainable', 'eco friendly', 'carbon', 'suzlon', 'gamesa'],
      a: `**Wind and solar at the factory**
• Suzlon - 1 unit, Hoovinahadagali (1.25 MW, installed 2008-09): 15,03,750 units in 2024-25
• Gamesa - 2 units, Chikkodi (0.85 MW each, installed 2011-12): 19,30,000 units in 2024-25
• Total windmill units wheeled in 2024-25: 34,33,750 (2023-24: 34,95,000)
• Solar project at CCF Puttur (500 kW): 5,61,243 units in 2024-25 (2023-24: 6,45,341)

Windmills meet about 50% of the factory's energy need and solar about 8% of roughly 72 lakh units.`,
      l: [['About Us', SITE + '/about-us/']], f: ['etp', 'cert', 'factory'] },

    { id: 'etp', t: 'Effluent & sewage treatment',
      k: ['etp', 'effluent', 'sewage', 'stp', 'waste water', 'wastewater', 'pollution', 'waste', 'water treatment', 'cpcb', 'kspcb'],
      a: `The factory has an upgraded **Effluent Treatment Plant** (meets CPCB and KSPCB standards; treated water is reused on the premises) and a newly installed **Sewage Treatment Plant** (meets KSPCB standards).`,
      l: [['About Us', SITE + '/about-us/']], f: ['green', 'cert'] },

    /* ---------------- Training, R&D, awards ---------------- */
    { id: 'skill', t: 'Training',
      k: ['skill', 'skills', 'training', 'skill development', 'tree climbing', 'ardf', 'climbing', 'leadership programme', 'fire fighting', 'natcon', 'ncui', 'workshop'],
      a: `**Skill development and training**
• Arecanut tree-climbing training with ARDF at CPCRI Vittal (Dec 2018, Feb 2019): 53 youth trained
• Cocoa quality, purchase and pricing training: 25 employees, CCF Puttur, 1 Jun 2024
• ERP training (basics, M3 navigation, MIS reports): Head Office, 14 Sep 2024
• NATCON conference, Mangaluru: 5 officials, 27-28 Sep 2024
• Leadership Development Programme for Directors and Chairpersons: NCUI New Delhi, 22-24 Oct 2024
• Fire-fighting training: 2 officials, 12-13 Sep 2024
• Prevention of Sexual Harassment sensitisation: 70 employees, 30 Sep 2024
• Growers' technology and marketing training at ICAR KVK, Gobichettipalayam, Tamil Nadu`,
      l: [['About Us', SITE + '/about-us/']], f: ['rnd', 'farmersdesk', 'awards'] },

    { id: 'rnd', t: 'Research & development',
      k: ['research', 'r&d', 'research and development', 'krishi yantra mela', 'yantra mela', 'trust', 'heggade', 'dharmasthala', 'r&d trust'],
      a: `• The **R&D Trust** was established on 20 May 1998. President: Dr. D. Veerendra Heggade (Dharmasthala); Managing Trustee: the CAMPCO President.
• A new R&D wing has opened; price behaviour analysis is its first step.
• **Krishi Yantra Mela** (ARDF with CAMPCO and Vivekananda Engineering College): 2009, 2012, 2015, 2019 and 2023.`,
      l: [['About Us', SITE + '/about-us/']], f: ['skill', 'farmersdesk'] },

    { id: 'awards', t: 'Awards',
      k: ['award', 'awards', 'recognition', 'recognitions', 'export excellence', 'achievement', 'achievements', 'fieo', 'fkcci', 'msme', 'honours', 'honors'],
      a: `**Awards and recognitions**
• 2014 - Govt. of Karnataka: State Export Excellence Award (Gold)
• 2016 - Govt. of Karnataka: Best Export Award, Processed Foods
• 2016 - FIEO Southern Region: Export Excellence Award
• 2018 - FIEO Southern Region: Top Multi-Product Group Exporter
• 2019 - FIEO Southern Region: Export Excellence Award
• 2021 - FKCCI: Special Recognition Award
• 2025 - Coastal Karnataka MSME: Best Agri Business Enterprise Award`,
      l: [['About Us', SITE + '/about-us/']], f: ['rating', 'cert', 'factory'] },

    /* ---------------- People ---------------- */
    { id: 'president', t: 'President',
      k: ['president', 'current president', 'satishchandra', 'satish chandra', 'sathishchandra', 'who is the president', 'chairman', 'vice president', 'padmaraj', 'pattaje'],
      a: `**Sri S.R. Satishchandra** is the current President of CAMPCO. He took office for the second time on 3 December 2025 (he was previously President from 31 Aug 2015 to 12 Dec 2020).

The Vice President is **Sri Padmaraj Pattaje**.`,
      l: [['Board of Directors', SITE + '/board-of-directors/']], f: ['board', 'formerpres', 'messages'] },

    { id: 'md', t: 'Managing Director',
      k: ['managing director', 'md', 'sathyanarayana', 'satyanarayana', 'current md', 'who is the md', 'ceo', 'head of campco', 'bvs'],
      a: `**Dr. B.V. Sathyanarayana** is the Managing Director (since 1 May 2024).
Email: bvsnarayana@campco.org`,
      l: [['Top Management', SITE + '/top-management/']], f: ['management', 'formermd', 'messages'] },

    { id: 'board', t: 'Board of Directors',
      k: ['board of directors', 'directors', 'director', 'board', 'director list', 'who are the directors', 'how many directors', 'board members'],
      a: `**Board of Directors (19)**
1. Sri S.R. Satishchandra - President
2. Sri Padmaraj Pattaje - Vice President
3. Sri Dayananda Hegde
4. Sri M. Mahesh Chouta M
5. Sri Radhakrishnan K
6. Sri Sathyanarayana Prasad
7. Sri Raghavendra H M
8. Sri Satheeshchandra Bhandary K
9. Sri Theertharama A V
10. Sri Purushothama Bhat M
11. Sri Venkatramana Bhat Y
12. Sri Vivekananda Gowda P
13. Sri Sadananda Shetty K
14. Sri Murali Krishna K N
15. Sri Ganesh Parakatta
16. Smt. Malini Prasad
17. Smt. Sowmya Prakash Madangallu
18. Sri Vishwanath Ishwar Hegde
19. Sri Ganesh`,
      l: [['Board of Directors', SITE + '/board-of-directors/']], f: ['president', 'management', 'formerpres'] },

    { id: 'management', t: 'Top management',
      k: ['top management', 'management', 'general manager', 'gm', 'dgm', 'agm', 'officers', 'staff email', 'manager', 'executives', 'senior officials', 'management team', 'official email'],
      a: `**Top management**
1. Dr. B.V. Sathyanarayana - Managing Director (bvsnarayana@campco.org)
2. Reshma Mallya - General Manager (reshmamallya@campco.org)
3. Govinda Bhat S - Dy. General Manager, Marketing (govindabhats@campco.org)
4. Raghavendra P - Asst. General Manager, Marketing (raghavendrap@campco.org)
5. Shyam Prasad H - Dy. General Manager I/C, CCF (shyamprasadh@campco.org)
6. Udayakumar Rai - Asst. General Manager, Marketing - CMD 1 (udayakumarrai@campco.org)
7. P. Muralidhara - Asst. General Manager, Accounts I/C (pmuralidhara@campco.org)`,
      l: [['Top Management', SITE + '/top-management/']], f: ['md', 'board', 'contact'] },

    { id: 'formermd', t: 'Former MDs',
      k: ['former managing director', 'former managing directors', 'former md', 'previous md', 'past md', 'previous managing director', 'earlier md', 'list of mds', 'all mds'],
      a: `**Former Managing Directors**
G.K. Sangameshwar (1973-78), D.V. Nayak (1978), A.A. Desai IAS (1978-88), Sudhir Kumar IAS (1988), C.N. Parashiva Murthy (1988-89), M.S. Mudnur (1989-92), S.D. Meena IAS (1992-93), Rajneesh Goel IAS (1993-95), K. Pramod Kumar Rai (1995-2000), R. Seetharam (2000-03), V. Channappa (2003), G.R. Krishnadas (2003-05), P. Madhusudan Rao (2005-10), A. Subramanya Bhat (2010-12), Suresh Bhandary M (2012-Apr 2021), Krishna Kumar H M (2021-Apr 2024) and Dr. B.V. Sathyanarayana (May 2024 - present).

Tip: ask "who was MD in 1995?" for a specific year.`,
      l: [['Former MDs', SITE + '/former-managing-directors/']], f: ['md', 'formerpres'] },

    { id: 'formerpres', t: 'Former Presidents',
      k: ['former president', 'former presidents', 'previous president', 'past president', 'earlier president', 'presidents list', 'list of presidents', 'all presidents', 'kodgi', 'kishore kumar kodgi'],
      a: `**Presidents since 1973**
Varanashi Subraya Bhat (1973-78, 1978-83, 1984-90), M. Ramappa, P. Ishwara Bhat, B. Narayana Nayak, K. Rama Bhat (1991-93, 1994-96), Khandige Srikrishna Bhat, S.R. Rangamurthy (1997-2001, 2005-10), B. Nagaraja Shetty (2001-04), V. Srikrishna Bhat, L.N. Kudoor, Konkodi Padmanabha (2010-15), S.R. Satishchandra (2015-20), A. Kishore Kumar Kodgi (Dec 2020 - Dec 2025) and S.R. Satishchandra again (3 Dec 2025 - present).

Tip: ask "who was president in 1985?" for a specific year.`,
      l: [['Former Presidents', SITE + '/former-president/']], f: ['president', 'founder', 'formermd'] },

    { id: 'messages', t: 'Leadership messages',
      k: ['president message', 'md message', 'message', 'messages', 'vision', 'mission', 'president speech', 'md speech'],
      a: `**President's message:** Sri Satishchandra thanks the thousands of farmers who regard CAMPCO as their strength, support and extended family, and renews his commitment on assuming office for the second time.

**Managing Director's message:** Dr. Sathyanarayana describes CAMPCO as a farmer-led, multi-state co-operative committed to farmers' betterment since 1973. It began with arecanut and has added cocoa, rubber, pepper and coconut.`,
      l: [['Read more', SITE + '/about-us/']], f: ['president', 'md', 'about'] },

    /* ---------------- Member services ---------------- */
    { id: 'benefit', t: 'Member benefits',
      k: ['member benefit', 'benefit scheme', 'benefits', 'benefit', 'medical', 'medical help', 'hospitalization', 'hospitalisation', 'accident', 'accidental death', 'disability', 'permanent disability', 'education fund', 'active member', 'insurance', 'financial assistance', 'scheme', 'schemes', 'higher studies', 'scholarship', 'major hospitalization'],
      a: `**Member Benefit Scheme** - financial assistance for:
• Medical treatment of a grower member or dependent
• Accidental death of an active member or dependent, and of a field worker
• Higher studies (PG / PhD / research in agriculture, horticulture or agri-engineering) for children of active members
• New from 1 Apr 2023: Permanent Disability and Education Fund schemes
• From 1 Jun 2024 - Major Hospitalization: for a single admission with expenses of Rs. 5.00 lakh or more, you can avail the least of 10% of the bill (net of discount), Rs. 1.00 lakh, or the bill amount after deducting discount, insurance or other amounts received

**Active member** (from 1 Jan 2025): tendered arecanut continuously in the last 3 financial years, averaging 1 quintal a year.`,
      l: [['Member Benefit Scheme', SITE + '/member-benefit-scheme/']], f: ['notification', 'complaint', 'sell'] },

    { id: 'notification', t: 'Notifications',
      k: ['notification', 'notifications', 'erp', 'auditor', 'auditors', 'audit', 'notice', 'circular', 'services suspended', 'announcement', 'announcements', 'statutory auditor'],
      a: `**Recent member notifications**
• 01/05/2024 - Cooperative Ombudsman created under the MSCS Act 2002 (Central Registrar order of 23 Apr 2024). Member complaints go in Form VI; appeals against the Cooperative Information Officer's orders in Form VII.
• 20/03/2024 - ERP rollout: branch and Head Office services were suspended 26 Mar - 6 Apr 2024 and resumed 8 Apr 2024. Cocoa wet beans were still purchased, with payment after 8 Apr 2024.
• 16/11/2023 - M/s B V C & Co, Bengaluru appointed Statutory Auditor and M/s YCRJ & Associates, Bengaluru Concurrent Auditor for 2023-24 (to be ratified by the General Body).`,
      l: [['Notifications', SITE + '/notification/']], f: ['complaint', 'benefit'], live: true },

    { id: 'complaint', t: 'Complaints / Ombudsman',
      k: ['complaint', 'complaints', 'grievance', 'ombudsman', 'cooperative ombudsman', 'form vi', 'form vii', 'rti', 'right to information', 'information officer', 'appeal', 'feedback', 'suggestion', 'suggestions'],
      a: `**Cooperative Ombudsman** (under the MSCS Act 2002) enquires into member complaints about deposits, equitable benefits, functioning and individual rights. File complaints in **Form VI**.

It is also the appellate authority against orders of the Cooperative Information Officer - appeals go in **Form VII**.

For general feedback and suggestions, use the Feedback page.`,
      l: [['Notifications', SITE + '/notification/'], ['Feedback', SITE + '/feedback/']], f: ['notification', 'contact'] },

    { id: 'manure', t: 'Manures & fertilizers',
      k: ['manure', 'manures', 'fertilizer', 'fertiliser', 'fertilizers', 'aayush', 'ayush', 'poushtika', 'dolomite', 'copper sulphate', 'bordeaux', 'bordeaux mixture', 'lime', 'hydrated lime', 'shell lime', 'maxwett', 'organic manure', 'micronutrient', 'soil conditioner', 'wetting agent', 'koleroga', 'fungicide'],
      a: `**Manures and fertilizers sold by CAMPCO**
• **AAYUSH** - complete organic manure: 12 ingredients (neem, pongamia and castor cake), composted with bio-stimulants (humic, fulvic, amino, seaweed) and bio-fertilizers. Improves soil fertility and root growth, reduces flower and nut drop. For all commercial, fruit, food and plantation crops.
• **POUSHTIKA** - soil-application micronutrient mixture (zinc, boron, iron, manganese)
• **Dolomite (granulated)** - calcium and magnesium; corrects soil acidity
• **Copper Sulphate** (1 kg) - key ingredient of Bordeaux mixture; contact fungicide
• **Hydrated Lime and Shell Lime** (1 kg) - neutralises copper sulphate, reduces phytotoxicity, improves sticking
• **MAXWETT** (500 ml, 1000 ml) - wetting and spreading agent for Bordeaux mixture, usable with pesticides, herbicides, fungicides and insecticides`,
      l: [['Manures & Fertilizers', SITE + '/manures-and-fertilizers/']], f: ['farmersdesk', 'areca', 'contact'] },

    { id: 'farmersdesk', t: "Farmer's Desk",
      k: ['farmers desk', 'farmer desk', 'soil testing', 'soil test', 'campco on wheels', 'wheels', 'campco circle', 'siddapura', 'weather', 'weather report', 'farmer', 'farmers', 'cocoa board', 'arecanut research', 'soil health'],
      a: `**Farmer's Desk**
• **Soil Testing** - a modern machine was installed at CAMPCO Puttur branch on 11 April 2025 (pH, NPK, organic carbon, micronutrients); to be extended to other regional offices
• **CAMPCO on Wheels** - launched in 2021 to reach farmers at their doorstep
• **Campco Circle** - landmark inaugurated at Siddapura, Udupi, symbolising farmer empowerment
• Useful links: Weather report, Cocoa Handbook, Cocoa Board, Arecanut Research and Development Foundation`,
      l: [["Farmer's Desk", SITE + '/farmers-desk/'], ['Cocoa Handbook', SITE + '/wp-content/uploads/2022/04/cocoa-handbook.pdf'], ['Cocoa Board', 'https://dccd.gov.in/'], ['ARDF', 'https://arecanut.org']], f: ['manure', 'cocoa', 'rnd'] },

    { id: 'tender', t: 'Tenders',
      k: ['tender', 'tenders', 'bid', 'bidders', 'quotation', 'e tender', 'etender'],
      a: `Tenders change often and I don't hold the details, so please check the Tender page for the latest.`,
      l: [['Tenders', SITE + '/tender/']], f: ['contact', 'careers'], live: true },

    { id: 'election', t: 'Elections',
      k: ['election', 'elections', 'voting', 'vote', 'election details', 'poll', 'ballot', 'nomination'],
      a: `Election information is published on the Election Details page. It is updated by CAMPCO, so please check there for the latest.`,
      l: [['Election Details', SITE + '/elections-details/']], f: ['board', 'notification'], live: true },

    { id: 'careers', t: 'Careers',
      k: ['career', 'careers', 'job', 'jobs', 'vacancy', 'vacancies', 'hiring', 'recruitment', 'apply', 'work with you', 'opening', 'openings', 'employment', 'work at campco'],
      a: `There are currently no open positions. The Careers page is updated whenever new opportunities come up.`,
      l: [['Careers', SITE + '/careers/']], f: ['contact', 'news'], live: true },

    { id: 'news', t: 'Latest news',
      k: ['news', 'latest news', 'events', 'whats new', 'recent', 'foundation day', 'lakhera', 'amit shah', 'sitharaman', 'delegation', 'press', 'updates', 'happening'],
      a: `**Latest news**
• 9 Aug 2026 - Lt Gen Vikas Lakhera, AVSM, SM visits the CAMPCO Chocolate Factory
• 1 Aug 2026 - CAMPCO delegation meets Union Ministers Amit Shah and Nirmala Sitharaman in New Delhi
• 13 Jul 2026 - CAMPCO marks Foundation Day, celebrating its 5-decade co-op journey`,
      l: [['All news', SITE + '/news/']], f: ['about', 'careers'], live: true },

    /* ---------------- Online shop ---------------- */
    { id: 'shop', t: 'Buy chocolates online',
      k: ['shop', 'buy', 'order', 'online', 'campco cart', 'cart', 'purchase', 'chocolates', 'chocolate', 'buy chocolate', 'delivery', 'free delivery', 'shipping', 'best seller', 'best sellers', 'price', 'prices', 'eclairs', 'gift box', 'drinking chocolate', 'mouth freshener', 'saugandh', 'choco treats', 'premium chocolates', 'cooking chocolate', 'campco bites', 'gift', 'sweets', 'toffee'],
      a: `You can buy online at **CAMPCO Cart**.
• Free delivery on orders over Rs. 200; delivery in 2 to 3 days
• Categories: Choco Treats, Drinking Chocolate, Gift Box, Mouth Freshener, Oil, Premium Chocolates, Cooking Chocolates, Spices, Eclairs
• Sample listings: Kala Sona Rs. 45, Campo Orange Eclairs Rs. 150, Campco Calpa from Rs. 218

Prices and stock change (some items showed "sold out" when captured), so please confirm on the shop. Shop help: +91 90355 68442.`,
      l: [['Shop Now', CART + '/'], ['Chocolates', CART + '/collections/chocolates']], f: ['recipes', 'industrial', 'distributor'], live: true },

    { id: 'industrial', t: 'Industrial products',
      k: ['industrial', 'industrial product', 'industrial products', 'bulk', 'compound chocolate', 'couverture', 'chips', 'choco paste', 'spreads', 'cocoa mass', 'cocoa butter', 'baker', 'bakery', 'ice cream', 'raw material', 'b2b', 'wholesale', 'bulk order', 'ingredients', 'chocolate chips'],
      a: `**CAMPCO Industrial Products** are chocolate and cocoa ingredients for bakers, ice-cream makers and food manufacturers:
• **Compound chocolates** - baker's chocolate (sugar, vegetable fat, cocoa powder) for cakes, pancakes, cookies
• **Couverture** - high cocoa butter; dark, milk and white; for professional bakers and ice cream
• **Cocoa powder** - for drinking chocolate, syrups, cream fillings
• **Cocoa mass and cocoa butter** - main ingredients for chocolate, ice cream, biscuits, sweets
• **Chocolate and compound chips** - for cookies, waffles, cakes, muffins, hot chocolate, pastries
• **Choco paste, spreads, dips and fillings** - for toast, bread, pastries

Use the enquiry form for bulk requirements.`,
      l: [['Industrial Products', CART + '/pages/industrial-products'], ['Enquiry Form', CART + '/pages/industrial-product-form']], f: ['factory', 'distributor', 'contact'] },

    { id: 'distributor', t: 'Distributor / sales offices',
      k: ['distributor', 'become a distributor', 'dealer', 'sales office', 'sales offices', 'locate sales', 'franchise', 'retail', 'stockist', 'where to buy', 'shop near me', 'distribution'],
      a: `To become a CAMPCO chocolate distributor, or to find a sales office, use the pages below.`,
      l: [['Become a Distributor', CART + '/pages/distributor'], ['Sales Offices', CART + '/pages/locate-sales-offices']], f: ['shop', 'industrial', 'contact'] },

    { id: 'recipes', t: 'Chocolate recipes',
      k: ['recipe', 'recipes', 'blog', 'kitchen', 'cook', 'cooking', 'kesari bath', 'papaya halwa', 'banana cake', 'laddoo', 'samosa', 'peanut butter', 'dessert'],
      a: `CAMPCO's kitchen blog has chocolate recipes such as:
• Choco Kesari Bath
• Choco Papaya Halwa
• Choco Eggless Banana Cake
• Choco Coconut Laddoo
• Chocolate Frozen Banana
• Samosa with Chocolate Filling
• Giant Peanut Butter Cup`,
      l: [['Recipes', CART + '/blogs/recipes']], f: ['shop', 'industrial'] },

    { id: 'social', t: 'Social media',
      k: ['facebook', 'instagram', 'youtube', 'twitter', 'social media', 'linkedin', 'pinterest', 'follow', 'x handle', 'social'],
      a: `Follow Campco Chocolates on Facebook, Instagram, YouTube, Twitter/X, Pinterest and LinkedIn (search "campcochocolatesindia").`,
      l: [['Facebook', 'https://www.facebook.com/campcochocolatesindia/'], ['Instagram', 'https://www.instagram.com/campcochocolatesindia'], ['YouTube', 'https://www.youtube.com/@CampcoChocolatesIndia']], f: ['shop', 'recipes'] },

    { id: 'help', t: 'What can you do?',
      k: ['help', 'what can you do', 'what can i ask', 'menu', 'options', 'topics', 'how to use', 'who made you', 'are you a bot', 'are you human', 'are you real'],
      a: `I'm the CAMPCO website assistant - an automated bot that answers from CAMPCO's published information. Ask me about:
• Products: arecanut, cocoa, pepper, rubber, coconut
• Member benefits, notifications and complaints
• Directors, management and past presidents / MDs (try "who was MD in 1995?")
• The Puttur chocolate factory, certifications and green energy
• The online chocolate shop, industrial products and manures

For anything I can't answer, I'll point you to the right page or contact.`,
      l: [], f: ['products', 'benefit', 'shop'] }
  ];

  var BY_ID = {};
  KB.forEach(function (e) { BY_ID[e.id] = e; });

  /* ---------------- People & office-bearer tables ---------------- */
  var MGMT = [
    ['Dr. B.V. Sathyanarayana', 'Managing Director', 'bvsnarayana@campco.org', 'md'],
    ['Reshma Mallya', 'General Manager', 'reshmamallya@campco.org'],
    ['Govinda Bhat S', 'Dy. General Manager (Marketing)', 'govindabhats@campco.org'],
    ['Raghavendra P', 'Asst. General Manager (Marketing)', 'raghavendrap@campco.org'],
    ['Shyam Prasad H', 'Dy. General Manager I/C (CCF)', 'shyamprasadh@campco.org'],
    ['Udayakumar Rai', 'Asst. General Manager (Marketing) - CMD 1', 'udayakumarrai@campco.org'],
    ['P. Muralidhara', 'Asst. General Manager (Accounts) I/C', 'pmuralidhara@campco.org']
  ];
  var BOARD = ['Sri S.R. Satishchandra|President|president', 'Sri Padmaraj Pattaje|Vice President|president', 'Sri Dayananda Hegde', 'Sri M. Mahesh Chouta M', 'Sri Radhakrishnan K', 'Sri Sathyanarayana Prasad', 'Sri Raghavendra H M', 'Sri Satheeshchandra Bhandary K', 'Sri Theertharama A V', 'Sri Purushothama Bhat M', 'Sri Venkatramana Bhat Y', 'Sri Vivekananda Gowda P', 'Sri Sadananda Shetty K', 'Sri Murali Krishna K N', 'Sri Ganesh Parakatta', 'Smt. Malini Prasad', 'Smt. Sowmya Prakash Madangallu', 'Sri Vishwanath Ishwar Hegde', 'Sri Ganesh'];

  /* [name, from ISO, to ISO, label as published] */
  var PRESIDENTS = [
    ['Varanashi Subraya Bhat', '1973-07-01', '1978-08-14', 'Jul 1973 - 14 Aug 1978'],
    ['M. Ramappa', '1978-08-15', '1978-09-08', '15 Aug 1978 - 8 Sep 1978'],
    ['P. Ishwara Bhat', '1978-09-09', '1978-10-27', '9 Sep 1978 - 27 Oct 1978'],
    ['Varanashi Subraya Bhat', '1978-10-28', '1983-10-12', '28 Oct 1978 - 12 Oct 1983'],
    ['B. Narayana Nayak', '1983-10-12', '1984-02-13', '12 Oct 1983 - 13 Feb 1984'],
    ['Varanashi Subraya Bhat', '1984-02-14', '1990-12-31', '14 Feb 1984 - 31 Dec 1990'],
    ['K. Rama Bhat', '1991-01-01', '1993-08-18', '1 Jan 1991 - 18 Aug 1993'],
    ['Khandige Srikrishna Bhat', '1993-08-18', '1993-12-31', '18 Aug 1993 - 31 Dec 1993'],
    ['K. Rama Bhat', '1994-01-01', '1996-12-31', '1 Jan 1994 - 31 Dec 1996'],
    ['S.R. Rangamurthy', '1997-01-01', '2001-03-30', '1 Jan 1997 - 30 Mar 2001'],
    ['B. Nagaraja Shetty', '2001-03-30', '2004-03-31', '30 Mar 2001 - 31 Mar 2004'],
    ['V. Srikrishna Bhat', '2004-04-01', '2004-04-07', '1 Apr 2004 - 7 Apr 2004'],
    ['L.N. Kudoor', '2004-04-08', '2005-12-24', '8 Apr 2004 - 24 Dec 2005'],
    ['S.R. Rangamurthy', '2005-12-25', '2010-01-14', '25 Dec 2005 - 14 Jan 2010'],
    ['V. Srikrishna Bhat', '2010-01-15', '2010-01-30', '15 Jan 2010 - 30 Jan 2010'],
    ['Konkodi Padmanabha', '2010-01-31', '2015-08-30', '31 Jan 2010 - 30 Aug 2015'],
    ['S.R. Satishchandra', '2015-08-31', '2020-12-12', '31 Aug 2015 - 12 Dec 2020'],
    ['A. Kishore Kumar Kodgi', '2020-12-13', '2025-12-03', '13 Dec 2020 - 3 Dec 2025'],
    ['S.R. Satishchandra', '2025-12-03', '9999-12-31', '3 Dec 2025 - present']
  ];
  var MDS = [
    ['G.K. Sangameshwar', '1973-07-01', '1978-06-01', 'Jul 1973 - 1 Jun 1978'],
    ['D.V. Nayak', '1978-06-02', '1978-07-02', '2 Jun 1978 - 2 Jul 1978'],
    ['A.A. Desai, IAS', '1978-07-03', '1988-03-07', '3 Jul 1978 - 7 Mar 1988'],
    ['Sudhir Kumar, IAS', '1988-03-08', '1988-06-24', '8 Mar 1988 - 24 Jun 1988'],
    ['C.N. Parashiva Murthy', '1988-09-01', '1989-05-31', '1 Sep 1988 - 31 May 1989'],
    ['M.S. Mudnur', '1989-06-01', '1992-10-01', '1 Jun 1989 - 1 Oct 1992'],
    ['S.D. Meena, IAS', '1992-10-02', '1993-04-24', '2 Oct 1992 - 24 Apr 1993'],
    ['Rajneesh Goel, IAS', '1993-05-27', '1995-07-11', '27 May 1993 - 11 Jul 1995'],
    ['K. Pramod Kumar Rai', '1995-07-14', '2000-08-16', '14 Jul 1995 - 16 Aug 2000'],
    ['R. Seetharam', '2000-08-17', '2003-07-31', '17 Aug 2000 - 31 Jul 2003'],
    ['V. Channappa', '2003-03-01', '2003-09-22', '1 Mar 2003 (as published) - 22 Sep 2003'],
    ['G.R. Krishnadas', '2003-09-22', '2005-09-23', '22 Sep 2003 - 23 Sep 2005'],
    ['P. Madhusudan Rao', '2005-09-23', '2010-03-31', '23 Sep 2005 - 31 Mar 2010'],
    ['A. Subramanya Bhat', '2010-04-01', '2012-03-31', '1 Apr 2010 - 31 Mar 2012'],
    ['Suresh Bhandary M', '2012-03-31', '2021-04-30', '31 Mar 2012 - 30 Apr 2021'],
    ['Krishna Kumar H M', '2021-05-01', '2024-04-30', '1 May 2021 - 30 Apr 2024'],
    ['Dr. B.V. Sathyanarayana', '2024-05-01', '9999-12-31', '1 May 2024 - present']
  ];

  /* ---------------- Words ---------------- */
  var CHIPS = [
    ['Products', '#products'], ['Buy chocolates', '#shop'], ['Member benefits', '#benefit'],
    ['Directors', '#board'], ['Factory visit', '#visit'], ['Fertilizers', '#manure'],
    ['Contact', '#contact'], ['Latest news', '#news']
  ];
  var STOP = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'me', 'my', 'i', 'you', 'your', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'please', 'tell', 'about', 'what', 'whats', 'which', 'how', 'there', 'it', 'its', 'this', 'that', 'with', 'any', 'some', 'give', 'show', 'want', 'need', 'know', 'who', 'where', 'when', 'campco', 'im', 'ill', 'us', 'we', 'have', 'has', 'get', 'by', 'from', 'than', 'then', 'so'];
  var SYN = { cost: 'price', costs: 'price', mobile: 'phone', telephone: 'phone', tel: 'phone', whatsapp: 'phone', helpline: 'phone', e: '', ceo: 'md', boss: 'md', chief: 'md', gift: 'gift', sms: 'phone', mailid: 'email', website: 'contact', url: 'contact', link: 'contact' };
  var WEAK_NAME = ['bhat', 'shetty', 'hegde', 'gowda', 'rai', 'krishna', 'prasad', 'kumar', 'sri', 'smt', 'dr'];
  var STOPSET = {}, WEAKSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });
  WEAK_NAME.forEach(function (w) { WEAKSET[w] = 1; });

  /* ================================================================== *
   *  MATCHING ENGINE
   * ================================================================== */
  function stem(w) {
    return w.length > 3 && w.charAt(w.length - 1) === 's' && w.slice(-2) !== 'ss' && w.slice(-2) !== 'us' ? w.slice(0, -1) : w;
  }
  function tokenize(s) {
    return s.toLowerCase().replace(/[\u2019']/g, '').replace(/[^a-z0-9& ]+/g, ' ')
      .split(/\s+/).filter(Boolean).map(stem);
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var rowMin = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function maxDist(len) { return len >= 9 ? 2 : (len >= 5 ? 1 : 0); }
  function wordMatch(kw, qw) {            /* 3 exact, 2 fuzzy, 0 none */
    if (kw === qw) return 3;
    var m = maxDist(kw.length);
    if (m && qw.length >= 4 && kw.charAt(0) === qw.charAt(0) && lev(kw, qw, m) <= m) return 2;
    return 0;
  }
  function containsSeq(hay, needle) {
    for (var i = 0; i + needle.length <= hay.length; i++) {
      var ok = true;
      for (var j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  }

  var INDEX = KB.map(function (e) {
    return {
      e: e,
      kws: e.k.map(function (kw) {
        var t = tokenize(kw);
        return { t: t, n: t.filter(function (w) { return !STOPSET[w]; }), raw: kw };
      })
    };
  });

  function queryTokens(q) {
    var t = tokenize(q), extra = [];
    t.forEach(function (w) { if (SYN[w]) extra.push(SYN[w]); });
    return { all: t, core: t.filter(function (w) { return !STOPSET[w]; }).concat(extra) };
  }

  function scoreKw(kw, qt) {
    if (!kw.t.length) return 0;
    if (kw.t.length === 1) {
      var w = kw.t[0], best = 0;
      if (STOPSET[w] && w !== 'md') { return containsSeq(qt.all, kw.t) ? 1 : 0; }
      for (var i = 0; i < qt.core.length; i++) best = Math.max(best, wordMatch(w, qt.core[i]));
      return best ? best + Math.min(w.length, 12) / 24 : 0;
    }
    if (containsSeq(qt.all, kw.t)) return 3 * kw.t.length + kw.raw.length / 30;
    if (kw.n.length >= 2) {            /* words in any order */
      var hit = 0;
      kw.n.forEach(function (w) {
        for (var i = 0; i < qt.core.length; i++) if (wordMatch(w, qt.core[i])) { hit++; return; }
      });
      if (hit === kw.n.length) return 2.2 * kw.n.length;
    }
    return 0;
  }

  function rank(q) {
    var qt = queryTokens(q), out = [];
    INDEX.forEach(function (row) {
      var s = row.kws.map(function (kw) { return scoreKw(kw, qt); }).filter(Boolean).sort(function (a, b) { return b - a; });
      if (!s.length) return;
      var total = s[0], i;
      for (i = 1; i < Math.min(s.length, 4); i++) total += 0.25 * s[i];
      out.push({ e: row.e, score: total });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  /* ---------------- People lookup ---------------- */
  var PEOPLE = [];
  MGMT.forEach(function (m) { PEOPLE.push({ name: m[0], role: m[1], email: m[2], kb: m[3], kind: 'staff' }); });
  BOARD.forEach(function (b) {
    var p = b.split('|');
    PEOPLE.push({ name: p[0], role: p[1] || 'Director', kb: p[2], kind: 'board' });
  });
  PEOPLE.forEach(function (p) {
    p.tokens = tokenize(p.name).filter(function (w) { return w.length >= 3 && !WEAKSET[w] || (w.length >= 3 && WEAKSET[w] && w !== 'sri' && w !== 'smt' && w !== 'dr'); });
  });

  function findPeople(q) {
    var qt = queryTokens(q).core.filter(function (w) { return w.length >= 4; });
    var res = [];
    PEOPLE.forEach(function (p) {
      var strong = 0, weak = 0;
      p.tokens.forEach(function (nt) {
        qt.forEach(function (w) {
          var ok = nt === w || (nt.length >= 7 && w.length >= 6 && lev(nt, w, 1) <= 1);
          if (ok) { if (WEAKSET[nt]) weak++; else strong++; }
        });
      });
      if (strong > 0) res.push({ p: p, strong: strong, weak: weak });
    });
    res.sort(function (a, b) { return (b.strong + b.weak * 0.3) - (a.strong + a.weak * 0.3); });
    return res;
  }

  function personAnswer(matches) {
    var top = matches[0];
    if (matches.length === 1 || (top.strong + top.weak * 0.3) > (matches[1].strong + matches[1].weak * 0.3) + 0.5) {
      var p = top.p;
      if (p.kb && BY_ID[p.kb]) { var e = BY_ID[p.kb]; return pack(e); }
      var text = '**' + p.name + '** - ' + p.role + (p.kind === 'board' ? " on CAMPCO's 19-member Board of Directors." : ' at CAMPCO.');
      if (p.email) text += '\nEmail: ' + p.email;
      return { text: text, links: [[p.kind === 'board' ? 'Board of Directors' : 'Top Management', SITE + (p.kind === 'board' ? '/board-of-directors/' : '/top-management/')]], chips: chipsFor(['board', 'management', 'contact']), id: 'person' };
    }
    if (matches.length > 5) return null;
    var lines = matches.map(function (m) { return '\u2022 ' + m.p.name + ' - ' + m.p.role; });
    return { text: 'A few people match that name:\n' + lines.join('\n'), links: [['Board of Directors', SITE + '/board-of-directors/'], ['Top Management', SITE + '/top-management/']], chips: chipsFor(['board', 'management']), id: 'person' };
  }

  /* ---------------- "Who was MD / President in YEAR" ---------------- */
  function whoInYear(q) {
    var m = q.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
    if (!m) return null;
    var year = parseInt(m[1], 10), nq = ' ' + tokenize(q).join(' ') + ' ';
    var wantPres = /\bpresident\b|\bchairman\b/.test(nq);
    var wantMd = /\bmd\b|\bmanaging director\b/.test(nq) || /\bceo\b/.test(nq);
    if (!wantPres && !wantMd) return null;
    if (year < 1973) return { text: 'CAMPCO was registered on 11 July 1973, so there were no office-bearers before that.', links: [], chips: chipsFor(['about', 'founder']), id: 'year' };
    var ys = year + '-01-01', ye = year + '-12-31', parts = [], links = [];
    function section(title, table, link) {
      var rows = table.filter(function (r) { return r[1] <= ye && r[2] >= ys; });
      if (!rows.length) { parts.push('**' + title + ' in ' + year + ':** no one is listed for that year in the published tables.'); }
      else parts.push('**' + title + ' in ' + year + ':**\n' + rows.map(function (r) { return '\u2022 ' + r[0] + ' (' + r[3] + ')'; }).join('\n'));
      links.push(link);
    }
    if (wantPres) section('President', PRESIDENTS, ['Former Presidents', SITE + '/former-president/']);
    if (wantMd) section('Managing Director', MDS, ['Former MDs', SITE + '/former-managing-directors/']);
    return { text: parts.join('\n\n'), links: links, chips: chipsFor(['formerpres', 'formermd', 'board']), id: 'year' };
  }

  /* ---------------- Reply assembly ---------------- */
  function chipsFor(ids) {
    return ids.filter(function (i) { return BY_ID[i]; }).map(function (i) { return [BY_ID[i].t, '#' + i]; });
  }
  function pack(e, extraIds) {
    var ids = (e.f || []).slice();
    (extraIds || []).forEach(function (i) { if (ids.indexOf(i) < 0 && i !== e.id) ids.push(i); });
    return { text: e.a, links: e.l || [], chips: chipsFor(ids.slice(0, 4)), id: e.id, live: !!e.live };
  }

  var lastEntry = null;

  function reply(q) {
    q = String(q || '').trim();
    if (q.charAt(0) === '#' && BY_ID[q.slice(1)]) { lastEntry = BY_ID[q.slice(1)]; return pack(lastEntry); }
    var plain = q.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (/^(hi+|hello|helo|hey+|namaste|namaskara|namaskar|good (morning|afternoon|evening))( there| campco| bot)?$/.test(plain)) {
      return { text: 'Hello! I can help with CAMPCO\u2019s products, member benefits, directors, the chocolate shop and more. What would you like to know?', links: [], chips: CHIPS.slice(0, 6), id: 'greet' };
    }
    if (/^(thanks|thank you|thankyou|thx|dhanyavad(a|agalu)?|ok thanks|great thanks|thanks a lot)$/.test(plain)) {
      return { text: 'You\u2019re welcome! Ask me anything else about CAMPCO.', links: [], chips: [], id: 'thanks' };
    }
    if (/^(bye|goodbye|see you|good night|tata)$/.test(plain)) {
      return { text: 'Goodbye! Have a great day.', links: [], chips: [], id: 'bye' };
    }
    if (lastEntry && /^(more|more info|more details|details|tell me more|elaborate|explain|read more|link|links)$/.test(plain)) {
      var r = pack(lastEntry);
      r.text = 'For full details on "' + lastEntry.t + '", please open the page below.';
      if (!r.links.length) r.links = [['CAMPCO Website', SITE + '/']];
      return r;
    }

    var yr = whoInYear(q);
    if (yr) return yr;

    var ranked = rank(q), top = ranked[0], topScore = top ? top.score : 0;

    var ppl = findPeople(q);
    if (ppl.length && topScore < 5) {
      var pa = personAnswer(ppl);
      if (pa) return pa;
    }

    if (top && topScore >= 2) {
      lastEntry = top.e;
      var extra = [];
      if (ranked[1] && ranked[1].score >= topScore * 0.7) extra.push(ranked[1].e.id);
      return pack(top.e, extra);
    }

    if (/^(w[a-z]{1,3}t (is|s) )?(the )?campco( ltd| cooperative| society)?$/.test(plain) || /^(w[a-z]{1,3}t|who) (is|are) (the )?campco$/.test(plain)) {
      lastEntry = BY_ID.about; return pack(BY_ID.about);
    }

    if (lastEntry && lastEntry.f && tokenize(q).length <= 5) {         /* short follow-up: look inside the last topic's neighbours */
      var near = ranked.filter(function (r) { return lastEntry.f.indexOf(r.e.id) >= 0 && r.score > 0.8; })[0];
      if (near) { lastEntry = near.e; return pack(near.e); }
    }
    if (/^(how are you|how r u|how do you do|whats up|sup)$/.test(plain)) {
      return { text: 'I\u2019m doing well, thank you! What would you like to know about CAMPCO?', links: [], chips: CHIPS.slice(0, 5), id: 'greet' };
    }

    var sugg = ranked.filter(function (r) { return r.score > 0.8; }).slice(0, 3).map(function (r) { return [r.e.t, '#' + r.e.id]; });
    return {
      text: 'Sorry, I couldn\u2019t find an answer for that. ' + (sugg.length ? 'Did you mean one of these?' : 'You can try asking about products, member benefits, directors, the factory or the online shop.') + '\n\nFor anything else, please contact CAMPCO: ' + PHONE + ' or ' + EMAIL + '.',
      links: [['Contact Us', SITE + '/contact-us/']],
      chips: sugg.length ? sugg : CHIPS.slice(0, 5),
      id: 'fallback', unanswered: true
    };
  }

  /* ================================================================== *
   *  UI
   * ================================================================== */
  function emit(type, data) {
    try {
      if (typeof CFG.onEvent === 'function') CFG.onEvent(type, data);
      if (CFG.logUrl && navigator.sendBeacon) navigator.sendBeacon(CFG.logUrl, JSON.stringify({ type: type, data: data, t: new Date().toISOString(), page: location.href }));
    } catch (e) { /* never break the chat */ }
  }

  function initUI() {
    var css = '\
#cc-launcher{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;background:' + GREEN + ';color:#fff;border:0;font-size:26px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99999;transition:transform .2s}\
#cc-launcher:hover{transform:scale(1.07)}\
#cc-launcher:focus-visible,#cc-panel button:focus-visible,#cc-panel a:focus-visible{outline:3px solid #ffbf47;outline-offset:2px}\
#cc-nudge{position:fixed;right:90px;bottom:30px;max-width:220px;background:#fff;color:#222;border-radius:12px;padding:10px 28px 10px 12px;font:14px/1.4 Karla,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.2);z-index:99998;cursor:pointer;display:none}\
#cc-nudge button{position:absolute;top:2px;right:6px;border:0;background:none;font-size:18px;cursor:pointer;color:#888}\
#cc-panel{position:fixed;right:20px;bottom:92px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:Karla,Arial,sans-serif;color:#222}\
#cc-panel.open{display:flex}\
#cc-head{background:' + GREEN + ';color:#fff;padding:12px 10px 12px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:6px}\
#cc-head small{display:block;font-weight:400;font-size:12px;opacity:.92}\
#cc-head .cc-hb{display:flex;gap:2px}\
#cc-head button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer;width:32px;height:32px;border-radius:6px}\
#cc-head button:hover{background:rgba(255,255,255,.18)}\
#cc-msgs{flex:1;overflow-y:auto;padding:14px;background:#f6f6f6;scroll-behavior:smooth}\
.cc-m{max-width:90%;padding:9px 13px;border-radius:14px;margin-bottom:10px;font-size:14px;line-height:1.5;word-wrap:break-word;overflow-wrap:anywhere}\
.cc-m div{margin:0}.cc-m .cc-gap{height:7px}\
.cc-m .cc-li{padding-left:14px;text-indent:-12px}\
.cc-m a{color:inherit;font-weight:600;text-decoration:underline}\
.cc-bot{background:#fff;color:#222;border-bottom-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.08)}\
.cc-bot a{color:' + GREEN + '}\
.cc-user{background:' + GREEN + ';color:#fff;margin-left:auto;border-bottom-right-radius:4px}\
.cc-live{font-size:11.5px;color:#8a5a00;background:#fff4dc;border-radius:8px;padding:4px 8px;margin:-4px 0 10px;display:inline-block}\
.cc-links{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}\
.cc-links a{background:#fff;color:' + GREEN + ';border:1px solid ' + GREEN + ';border-radius:16px;padding:4px 11px;font-size:12.5px;text-decoration:none;font-weight:600}\
.cc-links a:hover{background:' + GREEN + ';color:#fff}\
.cc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}\
.cc-chips button{background:#fff;border:1px solid #cfcfcf;border-radius:16px;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit;color:#222}\
.cc-chips button:hover{border-color:' + GREEN + ';color:' + GREEN + '}\
.cc-fb{font-size:12px;color:#777;margin:-4px 0 10px;display:flex;gap:8px;align-items:center}\
.cc-fb button{background:none;border:1px solid #ddd;border-radius:12px;cursor:pointer;padding:1px 8px;font-size:13px}\
.cc-fb button:hover{background:#eee}\
.cc-typing{display:inline-flex;gap:4px;padding:11px 14px}\
.cc-typing i{width:8px;height:8px;border-radius:50%;background:#aaa;animation:cc-b 1s infinite ease-in-out}\
.cc-typing i:nth-child(2){animation-delay:.15s}.cc-typing i:nth-child(3){animation-delay:.3s}\
@keyframes cc-b{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}\
@media (prefers-reduced-motion:reduce){.cc-typing i{animation:none}#cc-msgs{scroll-behavior:auto}#cc-launcher{transition:none}}\
#cc-form{display:flex;border-top:1px solid #e3e3e3;background:#fff}\
#cc-input{flex:1;border:0;padding:14px;font-size:14px;outline:none;font-family:inherit;min-width:0}\
#cc-send{background:none;border:0;color:' + GREEN + ';font-weight:700;padding:0 16px;cursor:pointer;font-family:inherit}\
#cc-head button.off{opacity:.55}\
.cc-streaming::after{content:"";display:inline-block;width:7px;height:7px;margin-left:3px;border-radius:50%;background:#222;vertical-align:middle;animation:cc-p 1s infinite}\
@keyframes cc-p{50%{opacity:.25}}\
#cc-foot{font-size:10.5px;color:#888;text-align:center;padding:4px 8px 6px;background:#fff}\
@media (max-width:480px){#cc-panel{right:0;left:0;bottom:0;top:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}#cc-nudge{right:20px;bottom:90px}}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var launcher = document.createElement('button');
    launcher.id = 'cc-launcher';
    launcher.setAttribute('aria-label', 'Open Campco chat assistant');
    launcher.innerHTML = '&#128172;';

    var nudge = document.createElement('div');
    nudge.id = 'cc-nudge';
    nudge.innerHTML = 'Need help? Ask about products, member benefits or the chocolate shop.<button aria-label="Dismiss">&times;</button>';

    var panel = document.createElement('div');
    panel.id = 'cc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Campco chat assistant');
    panel.innerHTML =
      '<div id="cc-head"><div>Campco Assistant<small id="cc-sub">Answers from CAMPCO\u2019s published info</small></div>' +
      '<div class="cc-hb"><button data-a="sound" title="Sound effects" aria-label="Toggle sound effects">&#128276;</button><button data-a="menu" title="Topics" aria-label="Show topics">&#9776;</button><button data-a="reset" title="Start over" aria-label="Start new conversation">&#8635;</button><button data-a="close" title="Close" aria-label="Close chat">&times;</button></div></div>' +
      '<div id="cc-msgs" role="log" aria-live="polite"></div>' +
      '<form id="cc-form"><input id="cc-input" placeholder="Type your question..." autocomplete="off" maxlength="300" aria-label="Your question"><button id="cc-send" type="submit">Send</button></form>' +
      '<div id="cc-foot">Info as of ' + DATA_DATE + '. Prices, stock, news and rates: check the live site.</div>';

    document.body.appendChild(launcher);
    document.body.appendChild(nudge);
    document.body.appendChild(panel);

    var msgs = panel.querySelector('#cc-msgs');
    var input = panel.querySelector('#cc-input');
    var hist = [], busy = false, KEY = 'cc-bot-v1';

    function save() { try { sessionStorage.setItem(KEY, JSON.stringify(hist.slice(-40))); } catch (e) {} }
    function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function scroll() { msgs.scrollTop = msgs.scrollHeight; }
    function txt(s) { return document.createTextNode(s); }

    /* ---------- settings ---------- */
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    var soundOn = lsGet('cc-sound') !== '0';

    /* ---------- Discord-style sounds (synthesised; optional custom files via CFG.sounds) ---------- */
    var actx = null;
    var NOTES = {
      send: [[392, 587, 0.11, 0, 0.10]],                                   /* quick rising blip */
      recv: [[698, 698, 0.10, 0, 0.11], [932, 932, 0.20, 0.11, 0.11]],     /* soft two-note ding */
      open: [[440, 587, 0.10, 0, 0.08]]
    };
    function tone(kind) {
      if (!soundOn) return;
      var file = CFG.sounds && (CFG.sounds[kind] || (kind === 'recv' && CFG.sounds.receive));
      if (file) { try { var a = new Audio(file); a.volume = 0.6; a.play().catch(function () {}); return; } catch (e) {} }
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        var t = actx.currentTime;
        (NOTES[kind] || []).forEach(function (n) {
          var o = actx.createOscillator(), g = actx.createGain(), st = t + n[3], en = st + n[2];
          o.type = 'sine';
          o.frequency.setValueAtTime(n[0], st);
          if (n[1] !== n[0]) o.frequency.exponentialRampToValueAtTime(n[1], en);
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(n[4], st + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, en);
          o.connect(g); g.connect(actx.destination);
          o.start(st); o.stop(en + 0.03);
        });
      } catch (e) {}
    }

    /* ---------- ChatGPT-style gradual reveal ---------- */
    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stream(el, cb) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n, total = 0;
      while ((n = w.nextNode())) { nodes.push({ n: n, full: n.nodeValue }); total += n.nodeValue.length; }
      if (REDUCED || !total) { cb(); return; }
      var shown = 0, done = false, per = Math.max(2, Math.ceil(total / 85)), timer;
      nodes.forEach(function (x) { x.n.nodeValue = ''; });
      el.classList.add('cc-streaming');
      function paint() {
        var left = shown;
        nodes.forEach(function (x) { var k = Math.max(0, Math.min(x.full.length, left)); x.n.nodeValue = x.full.slice(0, k); left -= k; });
      }
      function finish() {
        if (done) return; done = true;
        clearInterval(timer); shown = total; paint();
        el.classList.remove('cc-streaming'); el.removeEventListener('click', finish);
        cb();
      }
      el.addEventListener('click', finish);
      timer = setInterval(function () { shown = Math.min(total, shown + per); paint(); scroll(); if (shown >= total) finish(); }, 26);
    }

    /* ---------- offline indicator ---------- */
    var sub = panel.querySelector('#cc-sub');
    function netState() { sub.textContent = navigator.onLine === false ? 'Offline mode - all answers still work' : 'Answers from CAMPCO\u2019s published info'; }
    window.addEventListener('online', netState); window.addEventListener('offline', netState); netState();

    /* rich text: **bold**, bullets, emails, phones, urls - built with DOM nodes (no innerHTML) */
    var TOKEN = /(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|https?:\/\/[^\s)]+|0824 2888200|\+91 90355 68442)/g;
    function inline(parent, line) {
      var last = 0, m;
      TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(line))) {
        if (m.index > last) parent.appendChild(txt(line.slice(last, m.index)));
        var t = m[0], el;
        if (t.slice(0, 2) === '**') { el = document.createElement('strong'); el.textContent = t.slice(2, -2); }
        else {
          el = document.createElement('a');
          el.textContent = t;
          if (t.indexOf('@') > 0 && t.indexOf('http') !== 0) el.href = 'mailto:' + t;
          else if (/^https?:/.test(t)) { el.href = t; el.target = '_blank'; el.rel = 'noopener'; }
          else el.href = 'tel:' + t.replace(/[^\d+]/g, '');
        }
        parent.appendChild(el);
        last = m.index + t.length;
      }
      if (last < line.length) parent.appendChild(txt(line.slice(last)));
    }
    function rich(el, text) {
      text.split('\n').forEach(function (line) {
        var d = document.createElement('div');
        if (!line.trim()) { d.className = 'cc-gap'; }
        else {
          if (line.charAt(0) === '\u2022') d.className = 'cc-li';
          inline(d, line);
        }
        el.appendChild(d);
      });
    }

    function clearTransient() {
      Array.prototype.forEach.call(msgs.querySelectorAll('.cc-chips,.cc-fb'), function (n) { n.parentNode.removeChild(n); });
    }

    function renderUser(text) {
      var d = document.createElement('div');
      d.className = 'cc-m cc-user';
      d.textContent = text;
      msgs.appendChild(d);
    }

    function renderBot(rec, withExtras) {
      var d = document.createElement('div');
      d.className = 'cc-m cc-bot';
      rich(d, rec.text);
      msgs.appendChild(d);
      if (rec.live) {
        var lv = document.createElement('div');
        lv.className = 'cc-live';
        lv.textContent = 'Time-sensitive info - please confirm on the live site.';
        msgs.appendChild(lv);
      }
      if (rec.links && rec.links.length) {
        var w = document.createElement('div');
        w.className = 'cc-links';
        rec.links.forEach(function (l) {
          var a = document.createElement('a');
          a.href = l[1]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l[0];
          w.appendChild(a);
        });
        msgs.appendChild(w);
      }
      if (withExtras) {
        if (rec.fb) {
          var fb = document.createElement('div');
          fb.className = 'cc-fb';
          fb.appendChild(txt('Was this helpful?'));
          [['\uD83D\uDC4D', true], ['\uD83D\uDC4E', false]].forEach(function (b) {
            var btn = document.createElement('button');
            btn.type = 'button'; btn.textContent = b[0]; btn.setAttribute('aria-label', b[1] ? 'Helpful' : 'Not helpful');
            btn.addEventListener('click', function () {
              emit('feedback', { question: rec.fb.q, id: rec.fb.id, helpful: b[1] });
              fb.textContent = b[1] ? 'Thanks for the feedback!' : 'Thanks - for direct help call ' + PHONE + ' or email ' + EMAIL + '.';
            });
            fb.appendChild(btn);
          });
          msgs.appendChild(fb);
        }
        if (rec.chips && rec.chips.length) {
          var c = document.createElement('div');
          c.className = 'cc-chips';
          rec.chips.forEach(function (ch) {
            var b = document.createElement('button');
            b.type = 'button'; b.textContent = ch[0];
            b.addEventListener('click', function () { ask(ch[0], ch[1]); });
            c.appendChild(b);
          });
          msgs.appendChild(c);
        }
      }
      scroll();
    }

    function addBot(rec) { hist.push({ who: 'bot', rec: rec }); save(); renderBot(rec, true); }

    function ask(label, query) {
      if (busy) return;
      busy = true;
      tone('send');
      clearTransient();
      hist.push({ who: 'user', text: label }); renderUser(label);
      var t = document.createElement('div');
      t.className = 'cc-m cc-bot cc-typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      t.setAttribute('aria-label', 'Assistant is typing');
      msgs.appendChild(t); scroll();
      var r = reply(query || label);
      setTimeout(function () {                       /* floating dots phase, then the answer */
        if (t.parentNode) t.parentNode.removeChild(t);
        var rec = { text: r.text, links: r.links, chips: r.chips, live: r.live };
        if (r.id && ['greet', 'thanks', 'bye', 'fallback', 'person', 'year'].indexOf(r.id) < 0) rec.fb = { q: label, id: r.id };
        if (r.unanswered) emit('unanswered', { question: label });
        hist.push({ who: 'bot', rec: rec }); save();
        tone('recv');
        var start = msgs.children.length;
        renderBot(rec, true);
        var kids = Array.prototype.slice.call(msgs.children, start), bubble = kids[0], tail = kids.slice(1);
        tail.forEach(function (k) { k.style.display = 'none'; });
        stream(bubble, function () {
          tail.forEach(function (k) { k.style.display = ''; });
          scroll(); busy = false;
        });
      }, 650 + Math.random() * 450);
    }

    function welcome() {
      addBot({ text: 'Hello! Welcome to Campco. How can I help you today?', links: [], chips: CHIPS });
    }

    function restore() {
      var h = load();
      if (!h.length) return false;
      hist = h;
      h.forEach(function (m, i) {
        if (m.who === 'user') renderUser(m.text);
        else renderBot(m.rec, i === h.length - 1);
      });
      return true;
    }

    function open() {
      panel.classList.add('open');
      nudge.style.display = 'none';
      tone('open');
      if (!msgs.children.length && !restore()) welcome();
      scroll();
      input.focus();
      emit('open', {});
    }
    function close() { panel.classList.remove('open'); launcher.focus(); }

    function syncToggles() {
      var sd = panel.querySelector('[data-a="sound"]');
      sd.classList.toggle('off', !soundOn); sd.innerHTML = soundOn ? '&#128276;' : '&#128277;';
      sd.title = soundOn ? 'Sound effects: on' : 'Sound effects: off';
    }
    syncToggles();

    launcher.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
    panel.querySelector('#cc-head').addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'close') close();
      else if (a === 'sound') { soundOn = !soundOn; lsSet('cc-sound', soundOn ? '1' : '0'); syncToggles(); tone('recv'); }
      else if (a === 'reset') { hist = []; save(); msgs.innerHTML = ''; lastEntry = null; busy = false; welcome(); input.focus(); }
      else if (a === 'menu') { clearTransient(); addBot({ text: 'Pick a topic:', links: [], chips: CHIPS.concat([['Awards', '#awards'], ['Certifications', '#cert'], ['Industrial products', '#industrial'], ['Complaints', '#complaint']]) }); }
    });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    panel.querySelector('#cc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      ask(q, q);
    });

    nudge.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON') { nudge.style.display = 'none'; try { sessionStorage.setItem('cc-nudged', '1'); } catch (x) {} }
      else open();
    });
    try {
      if (!sessionStorage.getItem('cc-nudged') && !load().length) {
        setTimeout(function () {
          if (!panel.classList.contains('open')) { nudge.style.display = 'block'; sessionStorage.setItem('cc-nudged', '1'); }
        }, 8000);
      }
    } catch (e) {}

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} }

    window.CampcoBot.open = open;
    window.CampcoBot.close = close;
  }

  /* ---------------- Boot ---------------- */
  var api = { reply: reply, kb: KB };
  if (typeof window !== 'undefined') window.CampcoBot = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
    else initUI();
  }
})();