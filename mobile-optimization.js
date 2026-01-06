// mobile-optimization.js - Оптимизация для мобильных устройств

const MobileOptimization = {
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    
    init() {
        this.detectDevice();
        this.setupViewport();
        this.setupTouchHandlers();
        this.setupPWAFeatures();
        this.optimizeUI();
        this.setupVibration();
        this.setupOrientation();
        this.setupBatteryOptimization();
        this.setupPerformanceMonitoring();
    },
    
    detectDevice() {
        const ua = navigator.userAgent;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        this.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        this.isAndroid = /Android/.test(ua);
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone || 
                          document.referrer.includes('android-app://');
        
        console.log(`Устройство: ${this.isMobile ? 'Мобильное' : 'Десктоп'}, 
            iOS: ${this.isIOS}, 
            Android: ${this.isAndroid}, 
            PWA: ${this.isStandalone}`);
    },
    
    setupViewport() {
        // Динамическое обновление viewport для мобильных
        const metaViewport = document.querySelector('meta[name="viewport"]');
        
        if (this.isIOS) {
            // Фикс для iOS
            document.documentElement.style.setProperty('--vh', '1vh');
            
            // Предотвращение zoom на iOS
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (event) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
        }
        
        // Обновление высоты при изменении ориентации
        window.addEventListener('resize', () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Обновляем позиции элементов
            if (typeof updateHelpers === 'function') {
                updateHelpers();
            }
            if (typeof updateBuildingsOnField === 'function') {
                updateBuildingsOnField();
            }
        });
    },
    
    setupTouchHandlers() {
        // Улучшенные touch события
        const baby = document.getElementById('baby');
        if (!baby) return;
        
        let touchStartTime;
        let touchStartX;
        let touchStartY;
        
        baby.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            
            // Визуальная обратная связь
            baby.style.transform = 'scale(0.95)';
            baby.style.transition = 'transform 0.1s';
        }, { passive: true });
        
        baby.addEventListener('touchend', (e) => {
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            // Сброс трансформации
            baby.style.transform = 'scale(1)';
            
            // Определяем был ли это тап (короткое касание)
            if (touchDuration < 300) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const deltaX = Math.abs(touchEndX - touchStartX);
                const deltaY = Math.abs(touchEndY - touchStartY);
                
                // Если движение небольшое - считаем тапом
                if (deltaX < 10 && deltaY < 10) {
                    if (typeof tapBaby === 'function') {
                        tapBaby();
                    }
                }
            }
        }, { passive: true });
        
        baby.addEventListener('touchcancel', () => {
            baby.style.transform = 'scale(1)';
        }, { passive: true });
        
        // Долгое нажатие для контекстного меню (отключено)
        baby.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    },
    
    setupPWAFeatures() {
        // Проверка PWA установки
        if (this.isStandalone) {
            document.body.classList.add('pwa-mode');
            
            // Скрываем адресную строку в PWA
            window.scrollTo(0, 1);
            
            // Уведомление о PWA режиме
            console.log('Запущено в PWA режиме');
        }
        
        // Добавление в домашний экран
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Показываем кнопку установки
            this.showInstallButton();
        });
        
        // Отслеживание установки
        window.addEventListener('appinstalled', () => {
            console.log('PWA установлено');
            deferredPrompt = null;
            this.hideInstallButton();
        });
    },
    
    showInstallButton() {
        // Создаем кнопку установки
        const installBtn = document.createElement('button');
        installBtn.id = 'install-pwa-btn';
        installBtn.innerHTML = '📱 Установить приложение';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FF9F43, #FF6B6B);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            cursor: pointer;
            animation: pulse 2s infinite;
        `;
        
        installBtn.onclick = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('Пользователь установил PWA');
                    }
                    deferredPrompt = null;
                });
            }
        };
        
        document.body.appendChild(installBtn);
        
        // Автоматическое скрытие через 10 секунд
        setTimeout(() => this.hideInstallButton(), 10000);
    },
    
    hideInstallButton() {
        const btn = document.getElementById('install-pwa-btn');
        if (btn) {
            btn.style.opacity = '0';
            btn.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => btn.remove(), 300);
        }
    },
    
    optimizeUI() {
        if (!this.isMobile) return;
        
        // Увеличиваем область клика
        const baby = document.getElementById('baby');
        if (baby) {
            baby.style.minHeight = '150px';
            baby.style.minWidth = '150px';
            baby.style.cursor = 'pointer';
        }
        
        // Увеличиваем кнопки для тапов
        document.querySelectorAll('button, .building, .upgrade').forEach(el => {
            el.style.minHeight = '44px'; // Минимальный размер для iOS
            el.style.minWidth = '44px';
        });
        
        // Улучшаем скролл на iOS
        if (this.isIOS) {
            document.getElementById('content').style.WebkitOverflowScrolling = 'touch';
        }
        
        // Оптимизация для Android
        if (this.isAndroid) {
            document.body.style.touchAction = 'manipulation';
        }
        
        // Скрываем адресную строку при скролле
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop) {
                // Вниз
            } else {
                // Вверх
            }
            lastScrollTop = scrollTop;
        }, { passive: true });
    },
    
    setupVibration() {
        // Виброотклик (если поддерживается)
        if (navigator.vibrate) {
            const originalTap = window.tapBaby;
            if (originalTap) {
                window.tapBaby = function() {
                    navigator.vibrate(50);
                    return originalTap();
                };
            }
            
            // Виброотклик для покупок
            const originalBuyBuilding = window.buyBuilding;
            if (originalBuyBuilding) {
                window.buyBuilding = function(id) {
                    navigator.vibrate([30, 50, 30]);
                    return originalBuyBuilding(id);
                };
            }
        }
    },
    
    setupOrientation() {
        // Обработка ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                
                // Перерисовка интерфейса
                if (typeof renderBuildings === 'function') {
                    renderBuildings();
                }
                if (typeof updateHelpers === 'function') {
                    updateHelpers();
                }
            }, 300);
        });
        
        // Блокировка ориентации (только для некоторых экранов)
        if (screen.orientation && screen.orientation.lock) {
            try {
                screen.orientation.lock('portrait');
            } catch (e) {
                console.log('Блокировка ориентации не поддерживается');
            }
        }
    },
    
    setupBatteryOptimization() {
        // Оптимизация для экономии заряда
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                battery.addEventListener('levelchange', () => {
                    if (battery.level < 0.2) {
                        // Режим экономии энергии
                        this.enablePowerSavingMode();
                    } else {
                        this.disablePowerSavingMode();
                    }
                });
                
                battery.addEventListener('chargingchange', () => {
                    if (battery.charging) {
                        // Отключаем режим экономии при зарядке
                        this.disablePowerSavingMode();
                    }
                });
            });
        }
    },
    
    enablePowerSavingMode() {
        // Уменьшаем анимации и частоту обновлений
        document.body.classList.add('power-saving');
        
        // Замедляем игровой цикл
        if (game && game.intervals) {
            Object.values(game.intervals).forEach(interval => {
                clearInterval(interval);
            });
            
            // Медленный цикл
            game.intervals.game = setInterval(() => {
                if (typeof calculateCPS === 'function') calculateCPS();
                game.cookies += game.cps / 20; // Вдвое медленнее
                if (typeof updateUI === 'function') updateUI();
            }, 200);
        }
    },
    
    disablePowerSavingMode() {
        document.body.classList.remove('power-saving');
        // Восстанавливаем нормальную скорость
        if (typeof startGameLoop === 'function') {
            startGameLoop();
        }
    },
    
    setupPerformanceMonitoring() {
        // Мониторинг производительности
        if ('performance' in window) {
            const perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 100) {
                        console.warn('Медленная операция:', entry.name, entry.duration);
                    }
                }
            });
            
            perfObserver.observe({ entryTypes: ['measure', 'resource'] });
        }
        
        // Очистка памяти при фокусе
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Перерисовка при возвращении
                if (typeof updateUI === 'function') updateUI();
            } else {
                // Сохранение при уходе
                if (typeof saveGameFull === 'function') saveGameFull();
            }
        });
    }
};

// CSS для мобильной оптимизации
const mobileStyles = document.createElement('style');
mobileStyles.textContent = `
    @media (max-width: 768px) {
        /* Улучшения для мобильных */
        #baby-container {
            width: 140px !important;
            height: 140px !important;
            margin: 20px auto !important;
        }
        
        .building, .upgrade {
            padding: 15px !important;
            margin-bottom: 12px !important;
            border-radius: 12px !important;
        }
        
        #content {
            padding-bottom: 80px !important; /* Для нижней панели */
        }
        
        /* Лучшая навигация */
        .tab {
            padding: 15px 8px !important;
            font-size: 16px !important;
        }
        
        /* Увеличенные счетчики */
        .counter {
            font-size: 18px !important;
        }
        
        /* Адаптивные анимации */
        .power-saving .cookie-particle,
        .power-saving .helper,
        .power-saving .building-on-field {
            animation-duration: 2s !important;
            opacity: 0.7;
        }
        
        /* Специальные стили для PWA */
        .pwa-mode #header {
            padding-top: env(safe-area-inset-top);
        }
        
        .pwa-mode #prestige-btn {
            bottom: calc(20px + env(safe-area-inset-bottom));
        }
        
        /* Оптимизация для iPhone X+ */
        @supports (padding: max(0px)) {
            .pwa-mode {
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }
        }
    }
    
    @media (max-width: 480px) {
        /* Еще более компактный дизайн */
        .building {
            grid-template-columns: 50px 1fr !important;
            gap: 10px !important;
        }
        
        .building-icon {
            font-size: 24px !important;
        }
        
        #prestige-btn {
            width: 50px !important;
            height: 50px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
        }
    }
    
    /* Анимация пульсации для кнопки установки */
    @keyframes pulse {
        0% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
        100% { transform: translateX(-50%) scale(1); }
    }
    
    /* Улучшенный touch feedback */
    .building:active, .upgrade:active, button:active {
        background-color: rgba(255, 159, 67, 0.2) !important;
        transition: background-color 0.1s;
    }
    
    /* Отключение выделения текста */
    * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
    }
    
    /* Разрешаем выделение в полях ввода */
    input, textarea {
        -webkit-user-select: text;
        user-select: text;
    }
`;

document.head.appendChild(mobileStyles);