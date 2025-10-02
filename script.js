document.addEventListener('DOMContentLoaded', function () {
    // Register GSAP plugin required for scroll animations
    gsap.registerPlugin(ScrollTrigger);

    // --- Landing Page Animations ---
    let heroScene, heroCamera, heroRenderer, heroParticles;

    function initHeroAnimation() {
        const container = document.getElementById('hero-animation');
        if (!container) return;

        // Ensure THREE.js is available
        if (typeof THREE === 'undefined') {
            console.error('THREE.js is not loaded. Skipping hero animation.');
            return;
        }

        heroScene = new THREE.Scene();
        heroCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        heroRenderer = new THREE.WebGLRenderer({ alpha: true });
        heroRenderer.setSize(window.innerWidth, window.innerHeight);
        container.innerHTML = ''; // Clear previous canvas if any
        container.appendChild(heroRenderer.domElement);

        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const heroTargetPositions = new Float32Array(particleCount * 3);
        const heroInitialPositions = new Float32Array(particleCount * 3);

        const fontLoader = new THREE.FontLoader();
        fontLoader.load(
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
            function (font) {
                // --- All logic that depends on the font must go inside this callback ---
                const textGeometry = new THREE.TextGeometry('RISKON', { font: font, size: 1.5, height: 0.2, curveSegments: 12 });
                textGeometry.center();

                // Use MeshSurfaceSampler to get points on the text surface
                const sampler = new THREE.MeshSurfaceSampler(new THREE.Mesh(textGeometry)).build();
                const tempPosition = new THREE.Vector3();

                for (let i = 0; i < particleCount; i++) {
                    sampler.sample(tempPosition);
                    heroTargetPositions[i * 3] = tempPosition.x;
                    heroTargetPositions[i * 3 + 1] = tempPosition.y;
                    heroTargetPositions[i * 3 + 2] = tempPosition.z;
                }

                // Create initial random sphere positions
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    const radius = 10;
                    const theta = 2 * Math.PI * Math.random();
                    const phi = Math.acos(2 * Math.random() - 1);
                    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                    positions[i3 + 2] = radius * Math.cos(phi);
                }
                heroInitialPositions.set(positions);

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const material = new THREE.PointsMaterial({ color: 0x3b82f6, size: 0.035, transparent: true, opacity: 0 });
                heroParticles = new THREE.Points(geometry, material);
                heroScene.add(heroParticles);
                gsap.to(heroParticles.material, { opacity: 1, duration: 1 });

                // --- Setup the animation timeline AFTER the font is loaded ---
                const heroTimeline = gsap.timeline({ scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom bottom", scrub: 1 } });

                heroTimeline.to({}, {
                    duration: 1,
                    onUpdate: function () {
                        const progress = this.progress();
                        if (heroParticles) {
                            const positions = heroParticles.geometry.attributes.position.array;
                            for (let i = 0; i < particleCount; i++) {
                                const i3 = i * 3;
                                positions[i3] = THREE.MathUtils.lerp(heroInitialPositions[i3], heroTargetPositions[i3], progress);
                                positions[i3 + 1] = THREE.MathUtils.lerp(heroInitialPositions[i3 + 1], heroTargetPositions[i3 + 1], progress);
                                positions[i3 + 2] = THREE.MathUtils.lerp(heroInitialPositions[i3 + 2], heroTargetPositions[i3 + 2], progress);
                            }
                            heroParticles.geometry.attributes.position.needsUpdate = true;
                        }
                    }
                }, 0);

                heroTimeline.to({}, {
                    duration: 1,
                    onUpdate: function () {
                        const progress = this.progress();
                        if (heroParticles) {
                            const positions = heroParticles.geometry.attributes.position.array;
                            for (let i = 0; i < particleCount; i++) {
                                const i3 = i * 3;
                                const dismemberedX = heroTargetPositions[i3] * (1 + progress * 5);
                                const dismemberedY = heroTargetPositions[i3 + 1] * (1 + progress * 5);
                                const dismemberedZ = heroTargetPositions[i3 + 2] * (1 + progress * 5);
                                positions[i3] = dismemberedX;
                                positions[i3 + 1] = dismemberedY;
                                positions[i3 + 2] = dismemberedZ;
                            }
                            heroParticles.geometry.attributes.position.needsUpdate = true;
                            heroParticles.material.opacity = 1 - progress;
                        }
                    }
                }, 1);

                heroTimeline.to("#hero-text", { opacity: 1, duration: 0.5 }, 1.5);
                
                // Start the animation loop
                animateHero();
            },
            undefined, // onProgress callback (optional)
            function (error) {
                console.error('An error happened while loading the font:', error);
            }
        );

        heroCamera.position.z = 10;
    }

    function animateHero() {
        requestAnimationFrame(animateHero);
        if (heroRenderer && heroScene && heroCamera) {
            if (heroParticles && !ScrollTrigger.isScrolling) {
                heroParticles.rotation.y += 0.0001;
            }
            heroRenderer.render(heroScene, heroCamera);
        }
    }

    window.addEventListener('resize', () => {
        if (heroRenderer && heroCamera) {
            heroCamera.aspect = window.innerWidth / window.innerHeight;
            heroCamera.updateProjectionMatrix();
            heroRenderer.setSize(window.innerWidth, window.innerHeight);
        }
    }, false);

    initHeroAnimation();

    // --- NEW DATA PIPELINE ANIMATION ---
    function initDataPipelineAnimation() {
        const svg = document.getElementById('pipeline-svg');
        if (!svg) return;

        const ns = "http://www.w3.org/2000/svg";
        const hubX = 400, hubY = 250, hubR = 60;

        const sources = [
            { id: 'upi', x: 100, y: 100, color: '#3b82f6', icon: '📱', text: 'UPI & SMS', path: 'M 130 130 Q 250 150 350 220' },
            { id: 'telecom', x: 250, y: 420, color: '#f59e0b', icon: '📞', text: 'Telecom & Utilities', path: 'M 280 390 Q 300 350 360 280' },
            { id: 'geo', x: 700, y: 100, color: '#10b981', icon: '🏠', text: 'Geo & PIN-code', path: 'M 670 130 Q 550 150 450 220' },
            { id: 'agri', x: 550, y: 420, color: '#8b5cf6', icon: '🌾', text: 'Weather & Agri', path: 'M 520 390 Q 500 350 440 280' },
            { id: 'loans', x: 700, y: 250, color: '#ef4444', icon: '💳', text: 'Loans & Transactions', path: 'M 670 250 H 460' },
        ];

        // Create SVG elements
        let svgContent = `
            <g id="hub" class="pipeline-hub" transform="translate(${hubX}, ${hubY})">
                <circle r="${hubR}" class="hub-glow-bg"/>
                <circle r="${hubR}" class="hub-circle"/>
                <circle r="4" class="hub-particle p1" />
                <circle r="3" class="hub-particle p2" />
                <circle r="2" class="hub-particle p3" />
                <text y="8" text-anchor="middle" class="hub-text">RISKON</text>
            </g>
            <path id="output-stream" class="stream-line" d="M ${hubX} ${hubY + hubR} v 100" />
        `;

        sources.forEach(source => {
            svgContent += `
                <path id="${source.id}-path" class="stream-line" stroke="${source.color}" d="${source.path}" />
                <g id="${source.id}-group" class="source-icon" transform="translate(${source.x}, ${source.y})">
                    <circle r="30" class="icon-bg"/>
                    <text y="8" text-anchor="middle" class="icon-symbol">${source.icon}</text>
                    <text y="48" text-anchor="middle" class="icon-label">${source.text}</text>
                </g>
            `;
        });
        svg.innerHTML = svgContent;

        // --- GSAP Animation Timeline ---
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#data-pipeline-section",
                start: "center center",
                toggleActions: "play none none reverse",
            }
        });

        // 1. Initial State
        gsap.set("#hub, .source-icon, .stream-line, #output-stream, #pipeline-output-card", { autoAlpha: 0 });
        gsap.set("#hub, .source-icon", { scale: 0, transformOrigin: "center center" });
        gsap.set("#pipeline-output-card", { y: 30 });
        gsap.set(".stream-line", { strokeDasharray: 250, strokeDashoffset: 250 });
        gsap.set("#output-stream", { strokeDasharray: 100, strokeDashoffset: 100 });

        // 2. Hub & Text Appear
        tl.to("#hub", { autoAlpha: 1, scale: 1, duration: 1, ease: "elastic.out(1, 0.5)" }, "start");
        tl.from("#pipeline-text-container h2, #pipeline-text-container p", { y: 20, autoAlpha: 0, stagger: 0.2, duration: 0.8 }, "start+=0.2");
        
        // 3. Data Sources Appear
        tl.to(".source-icon", { autoAlpha: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.7)", stagger: 0.2 }, "start+=1");

        // 4. Flow into Hub
        sources.forEach(source => {
            tl.to(`#${source.id}-path`, { autoAlpha: 1 }, "flow");
            tl.to(`#${source.id}-path`, { strokeDashoffset: 0, duration: 2, ease: "power1.inOut" }, "flow");
        });
        tl.to(".hub-glow-bg", { attr: { r: 80 }, opacity: 0.5, duration: 2, ease: "power1.inOut" }, "flow");

        // 5. Processing Effect
        tl.to("#pipeline-text-container", {
            autoAlpha: 0, y: -20, duration: 0.5,
            onComplete: () => {
                const textContainer = document.querySelector("#pipeline-text-container");
                textContainer.querySelector("h2").textContent = "Processing Signals";
                textContainer.querySelector("p").textContent = "Transforming External Data into Actionable Credit Insights.";
            }
        }, "process");
        tl.to("#pipeline-text-container", { autoAlpha: 1, y: 0, duration: 0.5 });
        tl.to(".hub-particle.p1", { rotation: 360, svgOrigin: "400 250", duration: 2, repeat: 1, ease: "none" }, "process");
        tl.to(".hub-particle.p2", { rotation: -360, svgOrigin: "400 250", duration: 1.5, repeat: 1, ease: "none" }, "process");
        tl.to(".hub-particle.p3", { rotation: 720, svgOrigin: "400 250", duration: 2.5, repeat: 1, ease: "none" }, "process");
        
        // 6. Output
        tl.to("#output-stream", { autoAlpha: 1 }, "output");
        tl.to("#output-stream", { strokeDashoffset: 0, duration: 1, ease: "power1.out" }, "output");
        tl.to("#pipeline-output-card", { autoAlpha: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }, "output+=0.5");

        // 7. Loop Mode (on timeline complete)
        tl.eventCallback("onComplete", () => {
            gsap.to(".source-icon .icon-bg", { scale: 1.1, duration: 1, yoyo: true, repeat: -1, ease: "power1.inOut", stagger: 0.15 });
            gsap.to(".hub-glow-bg", { opacity: 0.3, duration: 1.5, yoyo: true, repeat: -1, ease: "power1.inOut" });
        });
    }

    initDataPipelineAnimation();

    // --- Page Elements ---
    const landingPage = document.getElementById('landing-page');
    const monitoringPage = document.getElementById('monitoring-page');
    const reportPage = document.getElementById('report-page');
    const slidesPage = document.getElementById('slides-page');
    const demoBtn = document.getElementById('demo-btn');
    const backToLandingBtn = document.getElementById('back-to-landing-btn');
    const backToMonitoringBtn = document.getElementById('back-to-monitoring-btn');
    const backToLandingFromSlidesBtn = document.getElementById('back-to-landing-from-slides');
    const navMethodologyBtn = document.getElementById('nav-methodology-btn');
    const applicantListContainer = document.getElementById('applicant-list');
    const reportContentWrapper = document.getElementById('report-content-wrapper');

    // --- Navigation ---
    function showPage(page) {
        landingPage.classList.add('hidden');
        monitoringPage.classList.add('hidden');
        reportPage.classList.add('hidden');
        if (slidesPage) slidesPage.classList.add('hidden');
        page.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            populateApplicantList();
            showPage(monitoringPage);
        });
    }
    if (backToLandingBtn) {
        backToLandingBtn.addEventListener('click', () => showPage(landingPage));
    }
    if (backToMonitoringBtn) {
        backToMonitoringBtn.addEventListener('click', () => showPage(monitoringPage));
    }

    // Slides page navigation
    if (navMethodologyBtn && slidesPage) {
        navMethodologyBtn.addEventListener('click', () => showPage(slidesPage));
    }
    if (backToLandingFromSlidesBtn) {
        backToLandingFromSlidesBtn.addEventListener('click', () => showPage(landingPage));
    }

    // Tabs logic for slides page
    function initSlidesTabs() {
        const tabButtons = document.querySelectorAll('.tabs .tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        if (!tabButtons.length || !tabContents.length) return;
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-tab');
                // update buttons
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // update contents
                tabContents.forEach(c => {
                    if (c.id === targetId) {
                        c.classList.remove('hidden');
                        c.classList.add('active');
                    } else {
                        c.classList.add('hidden');
                        c.classList.remove('active');
                    }
                });
            });
        });
    }
    initSlidesTabs();

    // Add back-to-top button functionality
    function addBackToTopButton() {
        const backToTopBtn = document.createElement('button');
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.innerHTML = '↑';
        backToTopBtn.setAttribute('aria-label', 'Back to top');
        document.body.appendChild(backToTopBtn);

        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        // Smooth scroll to top
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Initialize back-to-top button
    addBackToTopButton();

    // --- Utility Functions ---
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    function getLargestSpendingCategory(categories) {
        if (!categories || Object.keys(categories).length === 0) return 'N/A';

        const largest = Object.entries(categories).reduce((max, [key, value]) =>
            value > max.value ? { key, value } : max,
            { key: '', value: 0 }
        );

        return largest.key.charAt(0).toUpperCase() + largest.key.slice(1);
    }

    // --- Populate Applicant List ---
    function populateApplicantList() {
        if (!applicantListContainer || typeof applicantsData === 'undefined') {
            console.warn('Applicant list container or data not found');
            return;
        }

        applicantListContainer.innerHTML = '';
        Object.keys(applicantsData).forEach(applicantId => {
            const applicant = applicantsData[applicantId];
            const latestRecord = applicant.history.reduce((latest, current) =>
                (current.Month_Offset > latest.Month_Offset) ? current : latest, applicant.history[0]);

            const riskCategory = latestRecord.Risk_Category;
            const riskPercentage = (latestRecord.Predicted_Prob_Default * 100).toFixed(2);
            const riskColorClass = riskCategory === 'Low' ? 'text-green-400' :
                riskCategory === 'Medium' ? 'text-yellow-400' : 'text-red-400';

            // Enhanced data
            const avatar = applicant.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';
            const name = applicant.personal.name;
            const occupation = applicant.employment?.currentJob?.title || 'Not Available';
            const location = applicant.profile?.address ? `${applicant.profile.address.city}, ${applicant.profile.address.state}` : 'Location Not Available';
            const salary = applicant.employment?.currentJob?.salary ? formatCurrency(applicant.employment.currentJob.salary) : 'N/A';

            const item = document.createElement('div');
            item.className = 'glass-card monitoring-card enhanced-card cursor-pointer';
            item.innerHTML = `
                <div class="card-content-wrapper">
                    <div class="flex-shrink-0">
                        <img src="${avatar}" alt="${name}" class="applicant-avatar rounded-full object-cover" 
                               onerror="this.src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'">
                    </div>
                    <div class="card-main-info">
                        <div class="card-header-info">
                            <div>
                                <h3 class="applicant-name">${name}</h3>
                                <p class="applicant-id">ID: ${parseInt(applicantId)}</p>
                            </div>
                            <div class="risk-display">
                                <p class="risk-category-label">Risk (${riskCategory})</p>
                                <p class="risk-percentage ${riskColorClass}">${riskPercentage}%</p>
                            </div>
                        </div>
                        <div class="card-details-grid">
                            <div class="detail-item">
                                <p class="detail-label">Occupation</p>
                                <p class="detail-value">${occupation}</p>
                            </div>
                            <div class="detail-item">
                                <p class="detail-label">Location</p>
                                <p class="detail-value">${location}</p>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="salary-info">
                                <span class="salary-label">Annual Salary:</span>
                                <span class="salary-value">${salary}</span>
                            </div>
                            <div class="status-indicator status-active">
                                Active
                            </div>
                        </div>
                    </div>
                </div>`;

            item.addEventListener('click', () => {
                createDossierReport(applicantId);
                showPage(reportPage);
            });
            applicantListContainer.appendChild(item);
        });
    }

    // --- Fallback Data Generation ---
    function generateFallbackSpendingData(applicant) {
        const salary = applicant.employment?.currentJob?.salary || 600000;
        const monthlyIncome = salary / 12;

        // Adjust spending ratio based on income level
        let spendingRatio = 0.7; // Default 70%
        if (salary > 1500000) spendingRatio = 0.6; // High earners save more
        else if (salary < 400000) spendingRatio = 0.85; // Lower earners spend more

        const totalSpending = monthlyIncome * spendingRatio;

        // Add some randomization to make it more realistic
        const variation = 0.1; // 10% variation
        const randomize = (base) => Math.round(base * (1 + (Math.random() - 0.5) * variation));

        const fallbackData = {
            monthlyCategories: {
                groceries: randomize(totalSpending * 0.25),
                transportation: randomize(totalSpending * 0.18),
                utilities: randomize(totalSpending * 0.12),
                entertainment: randomize(totalSpending * 0.15),
                shopping: randomize(totalSpending * 0.12),
                dining: randomize(totalSpending * 0.10),
                healthcare: randomize(totalSpending * 0.05),
                other: randomize(totalSpending * 0.03)
            },
            averageMonthly: Math.round(totalSpending)
        };

        return fallbackData;
    }

    function generateFallbackInvestmentData(applicant) {
        const salary = applicant.employment?.currentJob?.salary || 600000;

        // Investment capacity based on income and age (assuming age from name/profile)
        let investmentMultiplier = 1.5; // Default 1.5x annual salary
        if (salary > 1500000) investmentMultiplier = 3.0; // High earners invest more
        else if (salary > 1000000) investmentMultiplier = 2.5;
        else if (salary < 500000) investmentMultiplier = 0.8;

        const investmentCapacity = salary * investmentMultiplier;

        // Adjust portfolio allocation based on income level (risk tolerance)
        let allocation;
        if (salary > 1500000) {
            // Aggressive portfolio for high earners
            allocation = { stocks: 0.50, mutualFunds: 0.25, bonds: 0.10, fixedDeposits: 0.10, other: 0.05 };
        } else if (salary > 800000) {
            // Moderate portfolio
            allocation = { stocks: 0.35, mutualFunds: 0.30, bonds: 0.15, fixedDeposits: 0.15, other: 0.05 };
        } else {
            // Conservative portfolio for lower earners
            allocation = { stocks: 0.25, mutualFunds: 0.25, bonds: 0.20, fixedDeposits: 0.25, other: 0.05 };
        }

        const fallbackData = {
            portfolio: {
                stocks: Math.round(investmentCapacity * allocation.stocks),
                mutualFunds: Math.round(investmentCapacity * allocation.mutualFunds),
                bonds: Math.round(investmentCapacity * allocation.bonds),
                fixedDeposits: Math.round(investmentCapacity * allocation.fixedDeposits),
                other: Math.round(investmentCapacity * allocation.other)
            },
            totalValue: Math.round(investmentCapacity),
            riskProfile: salary > 1500000 ? 'Aggressive' : salary > 800000 ? 'Moderate' : 'Conservative'
        };

        return fallbackData;
    }

    // --- Visual Chart Creation Functions ---
    function createSpendingVisual(containerId, spendingData) {
        const container = document.getElementById(containerId);
        if (!container || !spendingData || !spendingData.monthlyCategories) {
            return;
        }

        const categories = spendingData.monthlyCategories;
        const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

        if (total === 0) return;

        const colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];
        let currentAngle = 0;

        const gradients = Object.entries(categories).map(([category, amount], index) => {
            const percentage = (amount / total) * 100;
            const angle = (amount / total) * 360;
            const gradient = `${colors[index % colors.length]} ${currentAngle}deg ${currentAngle + angle}deg`;
            currentAngle += angle;
            return gradient;
        }).join(', ');

        container.style.background = `conic-gradient(${gradients})`;
        container.classList.add('loaded');

        // Create modern category cards
        const legendContainer = document.getElementById(containerId.replace('visual', 'legend'));
        if (legendContainer) {
            const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => b - a);
            legendContainer.innerHTML = sortedCategories.map(([category, amount], index) => {
                const percentage = ((amount / total) * 100).toFixed(1);
                const categoryIcons = {
                    groceries: '🛒',
                    transportation: '🚗',
                    utilities: '⚡',
                    entertainment: '🎬',
                    shopping: '🛍️',
                    dining: '🍽️',
                    healthcare: '🏥',
                    other: '📦'
                };
                const icon = categoryIcons[category.toLowerCase()] || '💰';
                return `
                    <div class="category-card-modern">
                        <div class="category-header-modern">
                            <div class="category-icon-wrapper">
                                <span class="category-icon">${icon}</span>
                                <div class="category-color-indicator" style="background-color: ${colors[index % colors.length]}"></div>
                            </div>
                            <div class="category-info">
                                <h5 class="category-name-modern">${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                                <p class="category-percentage-modern">${percentage}% of total</p>
                            </div>
                        </div>
                        <div class="category-amount-section">
                            <div class="category-amount-modern">${formatCurrency(amount)}</div>
                            <div class="category-progress-bar">
                                <div class="category-progress-fill" style="width: ${percentage}%; background-color: ${colors[index % colors.length]}"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    function createInvestmentVisual(containerId, investmentData) {
        const container = document.getElementById(containerId);
        if (!container || !investmentData || !investmentData.portfolio) {
            return;
        }

        const portfolio = investmentData.portfolio;
        const total = Object.values(portfolio).reduce((sum, val) => sum + val, 0);

        if (total === 0) return;

        const colors = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b'];
        let currentAngle = 0;

        const gradients = Object.entries(portfolio).map(([asset, amount], index) => {
            const percentage = (amount / total) * 100;
            const angle = (amount / total) * 360;
            const gradient = `${colors[index % colors.length]} ${currentAngle}deg ${currentAngle + angle}deg`;
            currentAngle += angle;
            return gradient;
        }).join(', ');

        container.style.background = `conic-gradient(${gradients})`;
        container.classList.add('loaded');

        // Create modern asset cards
        const legendContainer = document.getElementById(containerId.replace('visual', 'legend'));
        if (legendContainer) {
            const sortedAssets = Object.entries(portfolio).sort(([, a], [, b]) => b - a);
            legendContainer.innerHTML = sortedAssets.map(([asset, amount], index) => {
                const percentage = ((amount / total) * 100).toFixed(1);
                const assetIcons = {
                    stocks: '📊',
                    mutualfunds: '📈',
                    bonds: '🏛️',
                    fixeddeposits: '🏦',
                    other: '💼',
                    equity: '📊',
                    debt: '🏛️',
                    gold: '🥇',
                    realestate: '🏠'
                };
                const normalizedAsset = asset.toLowerCase().replace(/\s+/g, '');
                const icon = assetIcons[normalizedAsset] || '💰';
                
                // Risk level based on asset type
                const riskLevels = {
                    stocks: 'high',
                    equity: 'high',
                    mutualfunds: 'medium',
                    bonds: 'low',
                    debt: 'low',
                    fixeddeposits: 'low',
                    gold: 'medium',
                    realestate: 'medium',
                    other: 'medium'
                };
                const riskLevel = riskLevels[normalizedAsset] || 'medium';
                
                return `
                    <div class="asset-card-modern">
                        <div class="asset-header-modern">
                            <div class="asset-icon-wrapper">
                                <span class="asset-icon">${icon}</span>
                                <div class="asset-color-indicator" style="background-color: ${colors[index % colors.length]}"></div>
                            </div>
                            <div class="asset-info">
                                <h5 class="asset-name-modern">${asset.charAt(0).toUpperCase() + asset.slice(1)}</h5>
                                <p class="asset-percentage-modern">${percentage}% of portfolio</p>
                            </div>
                            <div class="asset-risk-badge risk-${riskLevel}">
                                ${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                            </div>
                        </div>
                        <div class="asset-amount-section">
                            <div class="asset-amount-modern">${formatCurrency(amount)}</div>
                            <div class="asset-progress-bar">
                                <div class="asset-progress-fill" style="width: ${percentage}%; background-color: ${colors[index % colors.length]}"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // --- Visual Chart Initialization ---
    function initializeVisualCharts(applicantId, applicant) {
        try {
            // Initialize spending visual chart
            const spendingVisual = document.getElementById(`spending-visual-${applicantId}`);
            if (spendingVisual && applicant.spending && applicant.spending.monthlyCategories) {
                let spendingData = applicant.spending;
                const spendingTotal = Object.values(spendingData.monthlyCategories).reduce((sum, val) => sum + val, 0);

                if (spendingTotal === 0) {
                    spendingData = generateFallbackSpendingData(applicant);
                }

                createSpendingVisual(`spending-visual-${applicantId}`, spendingData);
            }

            // Initialize investment visual chart
            const investmentVisual = document.getElementById(`investment-visual-${applicantId}`);
            if (investmentVisual && applicant.investments && applicant.investments.portfolio) {
                let investmentData = applicant.investments;
                const investmentTotal = Object.values(investmentData.portfolio).reduce((sum, val) => sum + val, 0);

                if (investmentTotal === 0) {
                    investmentData = generateFallbackInvestmentData(applicant);
                }

                createInvestmentVisual(`investment-visual-${applicantId}`, investmentData);
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // --- Enhanced Report Generation ---
    function createDossierReport(applicantId) {
        if (typeof applicantsData === 'undefined') {
            console.error('applicantsData not found');
            return;
        }

        const applicant = applicantsData[applicantId];

        // Validate and ensure enhanced data structure
        if (!applicant) {
            console.error('Applicant not found:', applicantId);
            return;
        }

        // Ensure enhanced data fields exist with fallbacks
        applicant.profile = applicant.profile || {};
        applicant.employment = applicant.employment || {};
        applicant.spending = applicant.spending || generateFallbackSpendingData(applicant);
        applicant.investments = applicant.investments || generateFallbackInvestmentData(applicant);
        applicant.location = applicant.location || {};

        const latestRecord = applicant.history.reduce((latest, current) =>
            (current.Month_Offset > latest.Month_Offset) ? current : latest, applicant.history[0]);

        const prob = latestRecord.Predicted_Prob_Default;
        let cibilScore;
        if (prob <= 0.15) {
            cibilScore = 780 + (1 - prob / 0.15) * 120;
        } else if (prob <= 0.70) {
            cibilScore = 650 + (1 - (prob - 0.15) / 0.55) * 130;
        } else {
            cibilScore = 300 + (1 - (prob - 0.70) / 0.30) * 350;
        }
        cibilScore = Math.round(cibilScore);

        const riskCategory = latestRecord.Risk_Category;
        const riskColorClass = riskCategory === 'Low' ? 'risk-low' :
            riskCategory === 'Medium' ? 'risk-medium' : 'risk-high';

        const paymentHistoryHTML = applicant.history
            .sort((a, b) => b.Month_Offset - a.Month_Offset)
            .map(h => {
                const probPercent = (h.Predicted_Prob_Default * 100).toFixed(1);
                const historyRiskColor = h.Risk_Category === 'Low' ? 'risk-low' :
                    h.Risk_Category === 'Medium' ? 'risk-medium' : 'risk-high';
                return `
                    <div class="history-item">
                        <div class="history-header">
                            <span class="history-month">Month ${h.Month_Offset}</span>
                            <span class="history-risk ${historyRiskColor}">${probPercent}%</span>
                        </div>
                        <div class="history-category ${historyRiskColor}">${h.Risk_Category} Risk</div>
                    </div>
                `;
            })
            .join('');

        const reportHTML = `
            <div id="report-page-container" class="report-container" style="opacity: 0;">
                <div class="report-header-enhanced">
                    <div class="header-main">
                        <h1>RISKON&trade; Intelligence Report</h1>
                        <div class="report-meta">
                            <span class="meta-item">
                                <span>${applicant.personal.name}</span>
                            </span>
                            <span class="meta-item">
                                <span>ID: ${applicantId}</span>
                            </span>
                            <span class="meta-item">
                                <span>${new Date().toLocaleDateString('en-GB')}</span>
                            </span>
                            <span class="meta-item">
                                <span>${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                        </div>
                    </div>
                    <div class="score-card-compact">
                        <div class="score-display">
                            <div id="cibil-score-span" class="score-number ${riskColorClass}">300</div>
                            <div class="score-subtitle">CIBIL Equivalent</div>
                        </div>
                        <div class="risk-summary">
                            <div class="risk-badge badge-${riskColorClass}">${riskCategory} Risk</div>
                            <div class="risk-detail">${(latestRecord.Predicted_Prob_Default * 100).toFixed(1)}% Default Probability</div>
                        </div>
                    </div>
                </div>

                <div class="section grid-2-col">
                    ${generatePersonalInfoCardsHTML(applicant)}

                    <div class="report-section financial-overview-section">
                        <h3 class="report-section-title">
                            <i class="section-icon">💰</i>
                            <span>Financial Overview</span>
                        </h3>
                        <div class="report-section-content">
                            <div class="financial-summary-grid">
                                <div class="financial-card primary-income-card">
                                    <div class="financial-card-header">
                                        <div class="card-icon income-icon">💵</div>
                                        <div class="card-title-section">
                                            <h4 class="card-title">Annual Income</h4>
                                            <p class="card-subtitle">Primary earnings</p>
                                        </div>
                                    </div>
                                    <div class="financial-card-content">
                                        <div class="primary-amount">${applicant.employment?.currentJob?.salary ? formatCurrency(applicant.employment.currentJob.salary) : 'N/A'}</div>
                                        <div class="amount-breakdown">
                                            <span class="breakdown-item">
                                                <span class="breakdown-label">Monthly</span>
                                                <span class="breakdown-value">${applicant.employment?.currentJob?.salary ? formatCurrency(Math.round(applicant.employment.currentJob.salary / 12)) : 'N/A'}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="financial-card spending-card">
                                    <div class="financial-card-header">
                                        <div class="card-icon spending-icon">🛒</div>
                                        <div class="card-title-section">
                                            <h4 class="card-title">Monthly Spending</h4>
                                            <p class="card-subtitle">Average expenses</p>
                                        </div>
                                    </div>
                                    <div class="financial-card-content">
                                        <div class="primary-amount">${applicant.spending ? formatCurrency(Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0)) : 'N/A'}</div>
                                        <div class="spending-ratio">
                                            <div class="ratio-bar">
                                                <div class="ratio-fill" style="width: ${applicant.employment?.currentJob?.salary && applicant.spending ? Math.min((Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0) * 12 / applicant.employment.currentJob.salary) * 100, 100) : 0}%"></div>
                                            </div>
                                            <span class="ratio-text">${applicant.employment?.currentJob?.salary && applicant.spending ? Math.min((Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0) * 12 / applicant.employment.currentJob.salary) * 100, 100).toFixed(0) : 0}% of income</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="financial-card investments-card">
                                    <div class="financial-card-header">
                                        <div class="card-icon investment-icon">📈</div>
                                        <div class="card-title-section">
                                            <h4 class="card-title">Total Investments</h4>
                                            <p class="card-subtitle">Portfolio value</p>
                                        </div>
                                    </div>
                                    <div class="financial-card-content">
                                        <div class="primary-amount">${applicant.investments ? formatCurrency(applicant.investments.totalValue || 0) : 'N/A'}</div>
                                        <div class="investment-growth">
                                            <div class="growth-indicator positive">
                                                <span class="growth-icon">↗️</span>
                                                <span class="growth-text">${applicant.investments?.riskProfile || 'Conservative'} Portfolio</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="financial-health-section">
                                <h4 class="health-section-title">Financial Health Indicators</h4>
                                <div class="health-indicators-grid">
                                    <div class="health-indicator">
                                        <div class="indicator-header">
                                            <span class="indicator-icon">🎯</span>
                                            <span class="indicator-name">Savings Rate</span>
                                        </div>
                                        <div class="indicator-content">
                                            <div class="indicator-value">${applicant.employment?.currentJob?.salary && applicant.spending ? Math.max(100 - (Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0) * 12 / applicant.employment.currentJob.salary) * 100, 0).toFixed(0) : 0}%</div>
                                            <div class="indicator-bar">
                                                <div class="indicator-fill" style="width: ${applicant.employment?.currentJob?.salary && applicant.spending ? Math.max(100 - (Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0) * 12 / applicant.employment.currentJob.salary) * 100, 0) : 0}%"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="health-indicator">
                                        <div class="indicator-header">
                                            <span class="indicator-icon">⚖️</span>
                                            <span class="indicator-name">Financial Stability</span>
                                        </div>
                                        <div class="indicator-content">
                                            <div class="indicator-value">${applicant.employment?.stabilityScore ? Math.round(applicant.employment.stabilityScore * 100) : 0}%</div>
                                            <div class="indicator-bar">
                                                <div class="indicator-fill" style="width: ${(applicant.employment?.stabilityScore || 0) * 100}%"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="health-indicator">
                                        <div class="indicator-header">
                                            <span class="indicator-icon">💎</span>
                                            <span class="indicator-name">Investment Ratio</span>
                                        </div>
                                        <div class="indicator-content">
                                            <div class="indicator-value">${applicant.employment?.currentJob?.salary && applicant.investments ? Math.min((applicant.investments.totalValue / applicant.employment.currentJob.salary) * 100, 100).toFixed(0) : 0}%</div>
                                            <div class="indicator-bar">
                                                <div class="indicator-fill" style="width: ${applicant.employment?.currentJob?.salary && applicant.investments ? Math.min((applicant.investments.totalValue / applicant.employment.currentJob.salary) * 100, 100) : 0}%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section report-section">
                    <h3 class="report-section-title">
                        <i class="section-icon">💼</i>
                        <span>Employment Analysis</span>
                    </h3>
                    <div class="report-section-content">
                        <div class="employment-hero-card">
                            <div class="employment-hero-content">
                                <div class="employment-primary-info">
                                    <div class="job-title-section">
                                        <h4 class="job-title">${applicant.employment?.currentJob?.title || 'Position Not Available'}</h4>
                                        <p class="company-name">${applicant.employment?.currentJob?.company || 'Company Not Available'}</p>
                                    </div>
                                    <div class="salary-badge">
                                        <span class="salary-amount">${applicant.employment?.currentJob?.salary ? formatCurrency(applicant.employment.currentJob.salary) : 'N/A'}</span>
                                        <span class="salary-label">Annual</span>
                                    </div>
                                </div>
                                <div class="employment-stability-indicator">
                                    <div class="stability-circle">
                                        <div class="stability-progress" style="--progress: ${(applicant.employment?.stabilityScore || 0) * 100}%">
                                            <span class="stability-percentage">${((applicant.employment?.stabilityScore || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <span class="stability-label">Job Stability</span>
                                </div>
                            </div>
                        </div>

                        <div class="employment-details-modern">
                            <div class="employment-info-card">
                                <div class="info-card-header">
                                    
                                    <span class="info-title">Industry & Type</span>
                                </div>
                                <div class="info-card-content">
                                    <div class="info-row">
                                        <span class="info-label">Industry</span>
                                        <span class="info-value">${applicant.employment?.currentJob?.industry || 'Not Specified'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Employment Type</span>
                                        <span class="info-value">${applicant.employment?.currentJob?.employmentType || 'Not Specified'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="employment-info-card">
                                <div class="info-card-header">
                                    
                                    <span class="info-title">Duration & Experience</span>
                                </div>
                                <div class="info-card-content">
                                    <div class="info-row">
                                        <span class="info-label">Current Role Duration</span>
                                        <span class="info-value">${applicant.employment?.currentJob?.duration || 'Not Available'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">Total Experience</span>
                                        <span class="info-value">${applicant.employment?.totalExperience || 'Not Available'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="employment-info-card">
                                <div class="info-card-header">
                                    
                                    <span class="info-title">Performance Metrics</span>
                                </div>
                                <div class="info-card-content">
                                    <div class="metric-row">
                                        <span class="metric-name">Income Stability</span>
                                        <div class="metric-bar-container">
                                            <div class="metric-bar-bg">
                                                <div class="metric-bar-fill" style="width: ${Math.min(((applicant.employment?.currentJob?.salary || 0) / 2000000) * 100, 100)}%"></div>
                                            </div>
                                            <span class="metric-percentage">${Math.min(((applicant.employment?.currentJob?.salary || 0) / 2000000) * 100, 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-name">Career Growth</span>
                                        <div class="metric-bar-container">
                                            <div class="metric-bar-bg">
                                                <div class="metric-bar-fill" style="width: ${((applicant.employment?.stabilityScore || 0) * 100)}%"></div>
                                            </div>
                                            <span class="metric-percentage">${((applicant.employment?.stabilityScore || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section grid-2-col">
                    <div class="report-section spending-analytics-section">
                        <h3 class="report-section-title">
                            <i class="section-icon">📊</i>
                            <span>Spending Analytics</span>
                        </h3>
                        <div class="report-section-content">
                            <div class="spending-hero-section">
                                <div class="spending-summary-modern">
                                    <div class="spending-total-card">
                                        <div class="total-header">
                                            <div class="total-icon">💳</div>
                                            <div class="total-info">
                                                <h4 class="total-title">Monthly Spending</h4>
                                                <p class="total-subtitle">Average expenses</p>
                                            </div>
                                        </div>
                                        <div class="total-amount-large">${applicant.spending ? formatCurrency(Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0)) : '₹0'}</div>
                                        <div class="spending-insights">
                                            <div class="insight-item">
                                                <span class="insight-label">Top Category</span>
                                                <span class="insight-value">${applicant.spending ? getLargestSpendingCategory(applicant.spending.monthlyCategories || {}) : 'N/A'}</span>
                                            </div>
                                            <div class="insight-item">
                                                <span class="insight-label">Categories</span>
                                                <span class="insight-value">${applicant.spending ? Object.keys(applicant.spending.monthlyCategories || {}).length : 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="spending-chart-section">
                                    <div class="chart-header">
                                        <h4 class="chart-title">Spending Breakdown</h4>
                                        <p class="chart-subtitle">Monthly distribution by category</p>
                                    </div>
                                    <div class="chart-container-modern">
                                        <div class="spending-donut-chart-modern" id="spending-visual-${applicantId}">
                                            <div class="donut-center-modern">
                                                <div class="donut-total-modern">${applicant.spending ? formatCurrency(Object.values(applicant.spending.monthlyCategories || {}).reduce((sum, val) => sum + val, 0)) : '₹0'}</div>
                                                <div class="donut-label-modern">Total</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="spending-categories-modern">
                                <div class="categories-header">
                                    <h4 class="categories-title">Category Breakdown</h4>
                                    <p class="categories-subtitle">Detailed spending analysis</p>
                                </div>
                                <div class="categories-grid" id="spending-legend-${applicantId}">
                                    </div>
                            </div>
                        </div>
                    </div>

                    <div class="report-section investment-portfolio-section">
                        <h3 class="report-section-title">
                            <i class="section-icon">📈</i>
                            <span>Investment Portfolio</span>
                        </h3>
                        <div class="report-section-content">
                            <div class="investment-hero-section">
                                <div class="portfolio-summary-modern">
                                    <div class="portfolio-total-card">
                                        <div class="portfolio-header">
                                            <div class="portfolio-icon">💎</div>
                                            <div class="portfolio-info">
                                                <h4 class="portfolio-title">Total Portfolio Value</h4>
                                                <p class="portfolio-subtitle">Current market value</p>
                                            </div>
                                        </div>
                                        <div class="portfolio-amount-large">${applicant.investments ? formatCurrency(applicant.investments.totalValue || 0) : '₹0'}</div>
                                        <div class="portfolio-insights">
                                            <div class="portfolio-insight-item">
                                                <span class="portfolio-insight-label">Risk Profile</span>
                                                <span class="portfolio-insight-value risk-${(applicant.investments?.riskProfile || 'Conservative').toLowerCase()}">${applicant.investments ? applicant.investments.riskProfile || 'Conservative' : 'Conservative'}</span>
                                            </div>
                                            <div class="portfolio-insight-item">
                                                <span class="portfolio-insight-label">Asset Types</span>
                                                <span class="portfolio-insight-value">${applicant.investments ? Object.keys(applicant.investments.portfolio || {}).length : 0}</span>
                                            </div>
                                        </div>
                                        <div class="portfolio-performance">
                                            <div class="performance-indicator positive">
                                                <span class="performance-icon">📊</span>
                                                <span class="performance-text">Well Diversified</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="investment-chart-section">
                                    <div class="investment-chart-header">
                                        <h4 class="investment-chart-title">Asset Allocation</h4>
                                        <p class="investment-chart-subtitle">Portfolio distribution by asset type</p>
                                    </div>
                                    <div class="investment-chart-container-modern">
                                        <div class="investment-pie-chart-modern" id="investment-visual-${applicantId}">
                                            <div class="investment-pie-center-modern">
                                                <div class="investment-pie-total-modern">${applicant.investments ? formatCurrency(applicant.investments.totalValue || 0) : '₹0'}</div>
                                                <div class="investment-pie-label-modern">Portfolio</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="investment-assets-modern">
                                <div class="assets-header">
                                    <h4 class="assets-title">Asset Breakdown</h4>
                                    <p class="assets-subtitle">Detailed portfolio composition</p>
                                </div>
                                <div class="assets-grid" id="investment-legend-${applicantId}">
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section report-section">
                    <h3 class="report-section-title">
                        
                        <span>Risk Analysis & Tracking</span>
                    </h3>
                    <div class="report-section-content">
                        <div class="risk-analysis-container">
                            <div class="graph-container">
                                <img src="${applicant.graphImage}" alt="Risk Trend Graph for Applicant ${applicantId}" class="risk-graph">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section report-section">
                    <h3 class="report-section-title">
                        
                        <span>Risk History Timeline</span>
                    </h3>
                    <div class="report-section-content">
                        <div class="history-timeline">
                            ${paymentHistoryHTML}
                        </div>
                    </div>
                </div>

                <div class="report-actions-section">
                    <button id="generate-report-btn" onclick="handleGenerateReport('${applicantId}')" class="action-btn primary-btn">
                        <svg class="btn-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12,1.75A10.25,10.25,0,0,0,1.75,12A10.25,10.25,0,0,0,12,22.25A10.25,10.25,0,0,0,22.25,12A10.25,10.25,0,0,0,12,1.75ZM9.25,6a1.5,1.5,0,1,1-1.5,1.5A1.5,1.5,0,0,1,9.25,6Zm6,12a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,15.25,18Zm-2-6a1.5,1.5,0,1,1-1.5,1.5A1.5,1.5,0,0,1,13.25,12Z"/>
                        </svg>
                        <span>Generate AI Summary</span>
                    </button>
                    
                    <div id="ai-summary-container" class="hidden">
                        <div class="report-section summary-section">
                            <h3 class="report-section-title">
                                
                                <span>AI-Generated Summary</span>
                            </h3>
                            <div class="report-section-content">
                                <p id="ai-summary-text" class="summary-text"></p>
                            </div>
                        </div>
                        <button id="download-pdf-btn" class="action-btn secondary-btn">
                            <svg class="btn-icon" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <span>Download PDF Report</span>
                        </button>
                    </div>
                </div>
            </div>`;

        try {
            if (reportContentWrapper) {
                reportContentWrapper.innerHTML = reportHTML;
                const downloadBtn = document.getElementById('download-pdf-btn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => downloadReportAsPDF(applicantId));
                }

                // Initialize visual charts after DOM is updated
                setTimeout(() => {
                    initializeVisualCharts(applicantId, applicant);
                }, 200);
            }
        } catch (error) {
            console.error('Report generation error:', error);
            if (reportContentWrapper) {
                reportContentWrapper.innerHTML = `
                    <div class="error-message">
                        <h3>Error generating report</h3>
                        <p>Please try again or contact support if the issue persists.</p>
                    </div>
                `;
            }
        }

        // Enhanced animations
        if (typeof gsap !== 'undefined') {
            const tl = gsap.timeline();
            const scoreCounter = { value: 300 };

            tl.to("#report-page-container", { opacity: 1, duration: 0.6 })
                .to(scoreCounter, {
                    value: cibilScore,
                    duration: 2,
                    ease: "power2.out",
                    onUpdate: () => {
                        const scoreElement = document.getElementById("cibil-score-span");
                        if (scoreElement) {
                            scoreElement.textContent = Math.round(scoreCounter.value);
                        }
                    }
                }, "-=0.3")
                .from(".section", { opacity: 0, y: 40, stagger: 0.15, duration: 0.8 }, "-=1.5")
                .from(".stat-card", { opacity: 0, scale: 0.9, stagger: 0.1, duration: 0.6 }, "-=1.2")
                .from(".graph-container img", { scale: 1.1, opacity: 0, duration: 1.2, ease: "power2.out" }, "-=1")
                .from(".history-item", { opacity: 0, x: -30, stagger: 0.05, duration: 0.5 }, "-=0.8")
                .from(".info-pair", { opacity: 0, y: 15, stagger: 0.02, duration: 0.4 }, "-=0.6");
        }
    }

    // --- PDF Download Function ---
    function downloadReportAsPDF(applicantId) {
        if (typeof applicantsData === 'undefined' || typeof html2pdf === 'undefined') {
            console.warn('Required libraries not loaded');
            return;
        }

        const applicant = applicantsData[applicantId];
        const reportElement = document.getElementById('report-page-container');
        const options = {
            margin: 0.5,
            filename: `RISKON_Report_${applicantId}_${applicant.personal.name.replace(' ', '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#1f2937' },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(reportElement).set(options).save();
    }

    // --- Handle Report Generation Click ---
    window.handleGenerateReport = function (applicantId) {
        if (typeof applicantsData === 'undefined') {
            console.warn('applicantsData not found');
            return;
        }

        const applicant = applicantsData[applicantId];
        const summaryContainer = document.getElementById('ai-summary-container');
        const summaryContent = document.getElementById('ai-summary-text');
        const generateBtn = document.getElementById('generate-report-btn');

        if (summaryContent) summaryContent.textContent = "";
        if (summaryContainer) {
            summaryContainer.classList.remove('hidden');
            if (typeof gsap !== 'undefined') {
                gsap.set(summaryContainer, { height: 'auto', opacity: 1 });
                gsap.from(summaryContainer, { height: 0, opacity: 0, duration: 0.8, ease: 'power2.out' });
            }
        }
        if (generateBtn) generateBtn.style.display = 'none';

        setTimeout(() => {
            const summary = applicant.geminiSummary || "This applicant shows a balanced financial profile with moderate risk indicators. Employment stability appears consistent with industry standards. Spending patterns suggest responsible financial management. Investment portfolio demonstrates appropriate diversification for the risk category. Overall assessment indicates manageable credit risk with standard monitoring recommended.";
            let i = 0;
            function typeWriter() {
                if (i < summary.length && summaryContent) {
                    summaryContent.innerHTML += summary.charAt(i);
                    i++;
                    setTimeout(typeWriter, 20);
                }
            }
            typeWriter();
        }, 1000);
    };

    // --- Helper function to generate Personal Information cards ---
    function generatePersonalInfoCardsHTML(applicant) {
        const personal = applicant.personal || {};
        const profile = applicant.profile || {};
        const address = profile.address || {};

        const fields = [
            { label: 'Full Name', value: personal.name, icon: '👤' },
            { label: 'Date of Birth', value: personal.dob, icon: '🎂' },
            { label: 'Gender', value: personal.gender, icon: '🚻' },
            { label: 'Phone', value: profile.phone, icon: '📱' },
            { label: 'Email', value: profile.email, icon: '✉️' },
            { label: 'Address', value: (address.street ? `${address.street}, ${address.city}, ${address.state} ${address.pincode}` : null), icon: '🏠' }
        ];

        let cardsHTML = '';
        fields.forEach(field => {
            if (field.value) {
                cardsHTML += `
                    <div class="category-card-modern" ${field.label === 'Address' ? 'style="grid-column: 1 / -1;"' : ''}>
                        <div class="category-header-modern">
                            <div class="category-icon-wrapper"><span class="category-icon">${field.icon}</span></div>
                            <div class="category-info">
                                <h5 class="category-name-modern">${field.label}</h5>
                            </div>
                        </div>
                        <div class="category-amount-section">
                            <div class="category-amount-modern" style="font-size: 1rem; color: #e2e8f0; font-weight: 500; text-align: left;">${field.value}</div>
                        </div>
                    </div>
                `;
            }
        });

        return `
            <div class="report-section personal-details-section">
                <h3 class="report-section-title">
                    <span class="section-icon">👤</span>
                    <span>Personal Information</span>
                </h3>
                <div class="report-section-content">
                    <div class="personal-cards-grid">
                        ${cardsHTML}
                    </div>
                </div>
            </div>
        `;
    }
});
