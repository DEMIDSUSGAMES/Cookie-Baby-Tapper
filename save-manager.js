// save-manager.js - Расширенная система сохранения игры

const SaveManager = {
    SAVE_VERSION: '3.0.0',
    BACKUP_INTERVAL: 30000, // 30 секунд
    MAX_BACKUPS: 5,
    SAVE_KEY: 'cookieBabySave_v3',
    
    init() {
        console.log('SaveManager инициализирован');
        this.setupAutoSave();
        this.setupBeforeUnload();
        this.setupPageHide();
        this.checkSaveIntegrity();
        this.migrateOldSaves();
    },
    
    // Основное сохранение
    saveGame() {
        try {
            const saveData = this.prepareSaveData();
            
            // Основное сохранение
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            
            // Создаем резервную копию
            this.createBackup(saveData);
            
            // Сохраняем в sessionStorage для восстановления
            sessionStorage.setItem('cookieBabyTempSave', JSON.stringify(saveData));
            
            // Инкрементальное сохранение (только изменения)
            this.saveIncremental(saveData);
            
            console.log('Игра сохранена успешно');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.emergencySave();
            return false;
        }
    },
    
    prepareSaveData() {
        if (!window.game) {
            throw new Error('Игровые данные не найдены');
        }
        
        return {
            version: this.SAVE_VERSION,
            timestamp: Date.now(),
            game: {
                cookies: window.game.cookies || 0,
                totalCookies: window.game.totalCookies || 0,
                cps: window.game.cps || 0,
                totalClicks: window.game.totalClicks || 0,
                goldenBabies: window.game.goldenBabies || 0,
                playTime: window.game.playTime || 0,
                prestigePoints: window.game.prestigePoints || 0,
                boredom: window.game.boredom || 0,
                lastClickTime: window.game.lastClickTime || Date.now(),
                buildings: window.game.buildings ? window.game.buildings.map(b => ({
                    id: b.id,
                    name: b.name,
                    price: b.price,
                    baseCps: b.baseCps,
                    count: b.count,
                    icon: b.icon,
                    helpers: b.helpers
                })) : [],
                upgrades: window.game.upgrades ? window.game.upgrades.map(u => ({
                    id: u.id,
                    name: u.name,
                    description: u.description,
                    price: u.price,
                    purchased: u.purchased,
                    effect: u.effect
                })) : [],
                helpers: window.game.helpers || [],
                buildingsOnField: window.game.buildingsOnField || [],
                achievements: window.game.achievedMilestones || [],
                stats: {
                    totalEarned: window.game.totalCookies || 0,
                    playTime: window.game.playTime || 0,
                    lastSession: Date.now()
                }
            },
            meta: {
                device: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`,
                platform: navigator.platform,
                language: navigator.language
            }
        };
    },
    
    // Загрузка игры
    loadGame() {
        try {
            // Пробуем загрузить из разных источников
            let saveData = null;
            
            // 1. Основное сохранение
            const mainSave = localStorage.getItem(this.SAVE_KEY);
            if (mainSave) {
                saveData = JSON.parse(mainSave);
                console.log('Загружено основное сохранение');
            }
            
            // 2. Проверяем версию
            if (saveData && saveData.version !== this.SAVE_VERSION) {
                console.log('Обновление сохранения с версии', saveData.version);
                saveData = this.migrateSave(saveData);
            }
            
            // 3. Если нет сохранения, создаем новое
            if (!saveData) {
                console.log('Новое сохранение создано');
                this.saveGame();
                return false;
            }
            
            // 4. Восстанавливаем игровые данные
            this.restoreGameData(saveData.game);
            
            // 5. Восстанавливаем UI
            if (typeof updateHelpers === 'function') updateHelpers();
            if (typeof updateBuildingsOnField === 'function') updateBuildingsOnField();
            if (typeof updateUI === 'function') updateUI();
            if (typeof renderBuildings === 'function') renderBuildings();
            if (typeof renderUpgrades === 'function') renderUpgrades();
            
            console.log('Игра загружена успешно');
            return true;
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            
            // Пробуем загрузить из резервной копии
            if (this.loadFromBackup()) {
                console.log('Загружено из резервной копии');
                return true;
            }
            
            // Пробуем восстановить из sessionStorage
            const tempSave = sessionStorage.getItem('cookieBabyTempSave');
            if (tempSave) {
                try {
                    const tempData = JSON.parse(tempSave);
                    this.restoreGameData(tempData.game);
                    console.log('Восстановлено из sessionStorage');
                    return true;
                } catch (e) {
                    console.error('Ошибка восстановления из sessionStorage:', e);
                }
            }
            
            // Создаем новую игру
            console.log('Создаем новую игру');
            return false;
        }
    },
    
    restoreGameData(gameData) {
        if (!window.game) window.game = {};
        
        Object.keys(gameData).forEach(key => {
            if (key === 'buildings') {
                // Восстанавливаем здания
                gameData.buildings.forEach(savedBuilding => {
                    const building = window.game.buildings?.find(b => b.id === savedBuilding.id);
                    if (building) {
                        Object.assign(building, savedBuilding);
                    }
                });
            } else if (key === 'upgrades') {
                // Восстанавливаем улучшения
                gameData.upgrades.forEach(savedUpgrade => {
                    const upgrade = window.game.upgrades?.find(u => u.id === savedUpgrade.id);
                    if (upgrade) {
                        Object.assign(upgrade, savedUpgrade);
                    }
                });
            } else {
                // Простые свойства
                window.game[key] = gameData[key];
            }
        });
    },
    
    // Резервные копии
    createBackup(saveData) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupKey = `cookieBabyBackup_${timestamp}`;
            
            // Сохраняем резервную копию
            localStorage.setItem(backupKey, JSON.stringify(saveData));
            
            // Управляем количеством резервных копий
            this.cleanupOldBackups();
            
            console.log('Резервная копия создана:', backupKey);
        } catch (error) {
            console.error('Ошибка создания резервной копии:', error);
        }
    },
    
    cleanupOldBackups() {
        const backups = [];
        
        // Находим все резервные копии
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cookieBabyBackup_')) {
                const value = localStorage.getItem(key);
                try {
                    const data = JSON.parse(value);
                    backups.push({
                        key,
                        timestamp: data.timestamp || 0
                    });
                } catch (e) {
                    // Удаляем поврежденные копии
                    localStorage.removeItem(key);
                }
            }
        }
        
        // Сортируем по времени (новые сначала)
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        // Удаляем старые копии
        if (backups.length > this.MAX_BACKUPS) {
            for (let i = this.MAX_BACKUPS; i < backups.length; i++) {
                localStorage.removeItem(backups[i].key);
                console.log('Удалена старая резервная копия:', backups[i].key);
            }
        }
    },
    
    loadFromBackup() {
        try {
            const backups = [];
            
            // Находим все резервные копии
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cookieBabyBackup_')) {
                    backups.push(key);
                }
            }
            
            // Берем самую свежую
            if (backups.length > 0) {
                backups.sort().reverse();
                const latestBackup = localStorage.getItem(backups[0]);
                const backupData = JSON.parse(latestBackup);
                
                this.restoreGameData(backupData.game);
                return true;
            }
        } catch (error) {
            console.error('Ошибка загрузки из резервной копии:', error);
        }
        return false;
    },
    
    // Инкрементальное сохранение (только изменения)
    saveIncremental(saveData) {
        try {
            const incrementalKey = 'cookieBabyIncremental';
            let incrementalData = JSON.parse(localStorage.getItem(incrementalKey) || '{}');
            
            // Сохраняем только изменения
            const changes = {
                timestamp: Date.now(),
                cookies: saveData.game.cookies,
                totalCookies: saveData.game.totalCookies,
                cps: saveData.game.cps,
                buildings: saveData.game.buildings.map(b => ({ id: b.id, count: b.count }))
            };
            
            incrementalData[Date.now()] = changes;
            
            // Ограничиваем размер инкрементальных данных
            const keys = Object.keys(incrementalData).sort();
            if (keys.length > 100) {
                delete incrementalData[keys[0]];
            }
            
            localStorage.setItem(incrementalKey, JSON.stringify(incrementalData));
        } catch (error) {
            console.error('Ошибка инкрементального сохранения:', error);
        }
    },
    
    // Экстренное сохранение (минимум данных)
    emergencySave() {
        try {
            const emergencyData = {
                cookies: window.game?.cookies || 0,
                totalCookies: window.game?.totalCookies || 0,
                timestamp: Date.now()
            };
            
            localStorage.setItem('cookieBabyEmergency', JSON.stringify(emergencyData));
            console.log('Экстренное сохранение выполнено');
        } catch (error) {
            console.error('Ошибка экстренного сохранения:', error);
        }
    },
    
    // Экспорт сохранения
    exportSave() {
        try {
            const saveData = this.prepareSaveData();
            const blob = new Blob([JSON.stringify(saveData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cookie-baby-save-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            return false;
        }
    },
    
    // Импорт сохранения
    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // Проверяем валидность
                    if (!importedData.version || !importedData.game) {
                        throw new Error('Неверный формат сохранения');
                    }
                    
                    // Миграция если нужно
                    const migratedData = this.migrateSave(importedData);
                    
                    // Сохраняем
                    localStorage.setItem(this.SAVE_KEY, JSON.stringify(migratedData));
                    
                    // Перезагружаем игру
                    if (this.loadGame()) {
                        resolve(true);
                    } else {
                        reject(new Error('Ошибка загрузки импортированного сохранения'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    },
    
    // Миграция старых сохранений
    migrateSave(oldSave) {
        let migrated = { ...oldSave };
        
        // Миграция с версии 1.x
        if (!migrated.version || migrated.version.startsWith('1.')) {
            console.log('Миграция с версии 1.x');
            migrated = this.migrateFromV1(oldSave);
        }
        
        // Миграция с версии 2.x
        if (migrated.version.startsWith('2.')) {
            console.log('Миграция с версии 2.x');
            migrated = this.migrateFromV2(migrated);
        }
        
        migrated.version = this.SAVE_VERSION;
        return migrated;
    },
    
    migrateFromV1(oldData) {
        return {
            version: '2.0.0',
            timestamp: Date.now(),
            game: {
                cookies: oldData.cookies || 0,
                totalCookies: oldData.totalCookies || 0,
                cps: oldData.cps || 0,
                totalClicks: oldData.totalClicks || 0,
                goldenBabies: oldData.goldenBabies || 0,
                playTime: oldData.playTime || 0,
                prestigePoints: oldData.prestigePoints || 0,
                boredom: oldData.boredom || 0,
                lastClickTime: oldData.lastClickTime || Date.now(),
                buildings: oldData.buildings || [],
                upgrades: oldData.upgrades || [],
                achievements: oldData.achievedMilestones || []
            }
        };
    },
    
    migrateFromV2(oldData) {
        return {
            ...oldData,
            version: '3.0.0',
            meta: {
                device: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: Date.now()
            }
        };
    },
    
    // Проверка целостности сохранения
    checkSaveIntegrity() {
        try {
            const save = localStorage.getItem(this.SAVE_KEY);
            if (!save) return true;
            
            const data = JSON.parse(save);
            
            // Проверяем необходимые поля
            if (!data.version || !data.game || !data.timestamp) {
                throw new Error('Сохранение повреждено');
            }
            
            // Проверяем типы данных
            if (typeof data.game.cookies !== 'number' ||
                typeof data.game.totalCookies !== 'number' ||
                !Array.isArray(data.game.buildings)) {
                throw new Error('Некорректные данные в сохранении');
            }
            
            console.log('Целостность сохранения проверена');
            return true;
        } catch (error) {
            console.error('Сохранение повреждено:', error);
            this.repairSave();
            return false;
        }
    },
    
    // Восстановление поврежденного сохранения
    repairSave() {
        console.log('Попытка восстановления сохранения...');
        
        // Пробуем загрузить из резервной копии
        if (this.loadFromBackup()) {
            console.log('Сохранение восстановлено из резервной копии');
            return true;
        }
        
        // Пробуем восстановить из инкрементальных данных
        const incrementalKey = 'cookieBabyIncremental';
        const incrementalData = JSON.parse(localStorage.getItem(incrementalKey) || '{}');
        
        if (Object.keys(incrementalData).length > 0) {
            const latest = Object.keys(incrementalData).sort().reverse()[0];
            const latestData = incrementalData[latest];
            
            // Восстанавливаем основные данные
            if (window.game) {
                window.game.cookies = latestData.cookies || 0;
                window.game.totalCookies = latestData.totalCookies || 0;
                window.game.cps = latestData.cps || 0;
                
                if (latestData.buildings) {
                    latestData.buildings.forEach(buildingData => {
                        const building = window.game.buildings?.find(b => b.id === buildingData.id);
                        if (building) {
                            building.count = buildingData.count || 0;
                        }
                    });
                }
            }
            
            console.log('Сохранение восстановлено из инкрементальных данных');
            this.saveGame();
            return true;
        }
        
        console.log('Восстановление не удалось, создаем новое сохранение');
        localStorage.removeItem(this.SAVE_KEY);
        return false;
    },
    
    // Автосохранение
    setupAutoSave() {
        setInterval(() => {
            if (window.game) {
                this.saveGame();
                this.showSaveNotification();
            }
        }, this.BACKUP_INTERVAL);
    },
    
    showSaveNotification() {
        // Создаем уведомление о сохранении
        const notification = document.createElement('div');
        notification.id = 'save-notification';
        notification.innerHTML = '💾 Автосохранение';
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(5px);
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },
    
    // Обработчики событий
    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            this.saveGame();
            
            // Стандартное подтверждение закрытия
            e.preventDefault();
            e.returnValue = '';
        });
    },
    
    setupPageHide() {
        // Сохраняем при переключении вкладок
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveGame();
            }
        });
        
        // Сохраняем при сворачивании приложения (мобильные)
        window.addEventListener('blur', () => {
            this.saveGame();
        });
    },
    
    // Отладочные функции
    debugSave() {
        console.log('=== Отладочная информация сохранения ===');
        console.log('Версия:', this.SAVE_VERSION);
        console.log('Размер localStorage:', JSON.stringify(localStorage).length, 'байт');
        
        const save = localStorage.getItem(this.SAVE_KEY);
        if (save) {
            console.log('Размер сохранения:', save.length, 'байт');
            try {
                const data = JSON.parse(save);
                console.log('Версия сохранения:', data.version);
                console.log('Время сохранения:', new Date(data.timestamp).toLocaleString());
                console.log('Печеньки:', data.game?.cookies);
                console.log('Всего печенек:', data.game?.totalCookies);
            } catch (e) {
                console.error('Ошибка парсинга сохранения:', e);
            }
        } else {
            console.log('Сохранение не найдено');
        }
        
        // Подсчет резервных копий
        let backupCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('cookieBabyBackup_')) {
                backupCount++;
            }
        }
        console.log('Резервных копий:', backupCount);
    },
    
    // Очистка всех сохранений
    clearAllSaves() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cookieBaby') || key.includes('cookie')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Все сохранения очищены');
    },
    
    // Проверка доступного места
    checkStorageSpace() {
        try {
            const testKey = 'storageTest';
            const testData = 'x'.repeat(1024 * 1024); // 1MB
            
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
            
            console.log('Достаточно места в localStorage');
            return true;
        } catch (e) {
            console.warn('Недостаточно места в localStorage');
            return false;
        }
    },
    
    // Миграция старых сохранений из предыдущих версий
    migrateOldSaves() {
        const oldKeys = ['cookieBabySave', 'cookieBabySave_v2'];
        
        oldKeys.forEach(oldKey => {
            const oldSave = localStorage.getItem(oldKey);
            if (oldSave) {
                try {
                    console.log(`Миграция со старого ключа: ${oldKey}`);
                    const oldData = JSON.parse(oldSave);
                    const migratedData = this.migrateSave(oldData);
                    
                    // Сохраняем в новый формат
                    localStorage.setItem(this.SAVE_KEY, JSON.stringify(migratedData));
                    
                    // Удаляем старый ключ
                    localStorage.removeItem(oldKey);
                    
                    console.log(`Миграция ${oldKey} завершена`);
                } catch (error) {
                    console.error(`Ошибка миграции ${oldKey}:`, error);
                }
            }
        });
    }
};

// Инициализация при загрузке
if (typeof window !== 'undefined') {
    window.SaveManager = SaveManager;
    
    // Автоматическая инициализация при полной загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SaveManager.init();
        });
    } else {
        SaveManager.init();
    }
}

// Экспорт для модулей (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveManager;
}