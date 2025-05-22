"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
// Lưu cài đặt mặc định
var defaultSettings = {
    general: {
        greenhouseName: 'Nhà kính chính',
        location: 'Khu vườn phía Bắc',
        description: 'Nhà kính chính cho sản xuất rau quả.',
        tempUnit: 'C',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        theme: 'light',
    },
    data: {
        refreshRate: 30, // 30 giây
        storageTime: 180, // 6 tháng (180 ngày)
        enableExport: true,
    },
    network: {
        wifi: {
            ssid: 'Greenhouse_Network',
            password: '********',
            security: 'WPA2-PSK',
            status: 'connected',
        },
        ip: {
            type: 'dhcp',
            address: '192.168.1.100',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1',
            dns: '8.8.8.8',
        },
        cloud: {
            enabled: true,
            server: 'cloud.greenhouse.io',
            apiKey: '********',
            syncInterval: 15, // 15 phút
        },
    },
    sensors: {
        'dht22': {
            enabled: true,
            calibration: 0,
            alertThresholds: {
                min: 20,
                max: 30,
            },
        },
        'bh1750': {
            enabled: true,
            calibration: 0,
            alertThresholds: {
                min: 1000,
                max: 5000,
            },
        },
        'soil_moisture': {
            enabled: true,
            calibration: 0,
            alertThresholds: {
                min: 40,
                max: 80,
            },
        },
    },
    notifications: {
        email: {
            enabled: true,
            address: 'user@example.com',
        },
        push: {
            enabled: true,
        },
        alertTypes: {
            system: true,
            sensor: true,
            schedule: true,
            update: true,
        },
    },
};
// Quản lý lưu trữ và truy xuất cài đặt
var SettingsManager = /** @class */ (function () {
    function SettingsManager() {
        this.storageKey = 'greenhouse_settings';
        // Khởi tạo cài đặt từ localStorage hoặc sử dụng mặc định
        var savedSettings = localStorage.getItem(this.storageKey);
        if (savedSettings) {
            try {
                this.settings = JSON.parse(savedSettings);
            }
            catch (e) {
                console.error('Lỗi khi đọc cài đặt từ localStorage:', e);
                this.settings = __assign({}, defaultSettings);
            }
        }
        else {
            this.settings = __assign({}, defaultSettings);
        }
    }
    // Dùng Singleton pattern để đảm bảo chỉ có một instance của SettingsManager
    SettingsManager.getInstance = function () {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    };
    // Lấy toàn bộ cài đặt
    SettingsManager.prototype.getSettings = function () {
        return __assign({}, this.settings);
    };
    // Lấy một phần cài đặt cụ thể
    SettingsManager.prototype.getSetting = function (key) {
        return __assign({}, this.settings[key]);
    };
    // Cập nhật cài đặt
    SettingsManager.prototype.updateSettings = function (newSettings) {
        this.settings = __assign(__assign({}, this.settings), newSettings);
        this.saveSettings();
    };
    // Cập nhật một phần cài đặt cụ thể
    SettingsManager.prototype.updateSetting = function (key, value) {
        this.settings[key] = __assign(__assign({}, this.settings[key]), value);
        this.saveSettings();
    };
    // Đặt lại cài đặt về mặc định
    SettingsManager.prototype.resetSettings = function () {
        this.settings = __assign({}, defaultSettings);
        this.saveSettings();
    };
    // Lưu cài đặt vào localStorage
    SettingsManager.prototype.saveSettings = function () {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            // Thông báo cho server về thay đổi cài đặt
            this.sendSettingsToServer();
        }
        catch (e) {
            console.error('Lỗi khi lưu cài đặt vào localStorage:', e);
        }
    };
    // Gửi cài đặt đến server (nếu cần)
    SettingsManager.prototype.sendSettingsToServer = function () {
        // Kiểm tra đăng nhập
        if (!localStorage.getItem('username')) {
            console.warn('Người dùng chưa đăng nhập, không thể đồng bộ cài đặt với server');
            return;
        }
        // Gửi cập nhật đến server
        fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.settings),
        })
            .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP error! status: ".concat(response.status));
            }
            return response.json();
        })
            .then(function (data) {
            console.log('Cài đặt đã được đồng bộ với server:', data);
        })
            .catch(function (error) {
            console.error('Lỗi khi gửi cài đặt đến server:', error);
        });
    };
    // Xuất cài đặt thành file JSON để lưu trữ
    SettingsManager.prototype.exportSettings = function () {
        var settings = JSON.stringify(this.settings, null, 2);
        var blob = new Blob([settings], { type: 'application/json' });
        return URL.createObjectURL(blob);
    };
    // Nhập cài đặt từ file JSON
    SettingsManager.prototype.importSettings = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onload = function (event) {
                            try {
                                if (event.target && typeof event.target.result === 'string') {
                                    var importedSettings = JSON.parse(event.target.result);
                                    // Kiểm tra cấu trúc cài đặt hợp lệ
                                    if (_this.validateSettings(importedSettings)) {
                                        _this.settings = importedSettings;
                                        _this.saveSettings();
                                        resolve(true);
                                    }
                                    else {
                                        reject(new Error('Cấu trúc file cài đặt không hợp lệ'));
                                    }
                                }
                            }
                            catch (e) {
                                reject(new Error('Không thể đọc file cài đặt'));
                            }
                        };
                        reader.onerror = function () { return reject(new Error('Lỗi khi đọc file')); };
                        reader.readAsText(file);
                    })];
            });
        });
    };
    // Kiểm tra tính hợp lệ của cấu trúc cài đặt
    SettingsManager.prototype.validateSettings = function (settings) {
        if (!settings)
            return false;
        if (!settings.general || !settings.data || !settings.network ||
            !settings.sensors || !settings.notifications) {
            return false;
        }
        return true;
    };
    return SettingsManager;
}());
exports.SettingsManager = SettingsManager;
// Quản lý UI cho trang cài đặt
var SettingsUI = /** @class */ (function () {
    function SettingsUI() {
        this.activeTab = 'general';
        this.settingsManager = SettingsManager.getInstance();
        this.initUI();
    }
    SettingsUI.prototype.initUI = function () {
        // Kiểm tra xem đang ở trang settings không
        if (!window.location.pathname.includes('settings.html')) {
            return;
        }
        // Khởi tạo sự kiện tab
        this.initTabEvents();
        // Hiển thị cài đặt hiện tại
        this.displayCurrentSettings();
        // Khởi tạo các sự kiện form
        this.initFormEvents();
    };
    SettingsUI.prototype.initTabEvents = function () {
        var _this = this;
        var tabs = document.querySelectorAll('.tab-button');
        var cards = document.querySelectorAll('.settings-card');
        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                var _a;
                // Loại bỏ active class từ tất cả tabs
                tabs.forEach(function (t) { return t.classList.remove('active'); });
                // Thêm active class cho tab được nhấn
                tab.classList.add('active');
                // Ẩn tất cả cards
                cards.forEach(function (card) {
                    card.style.display = 'none';
                });
                // Hiển thị card tương ứng
                if (cards[index]) {
                    cards[index].style.display = 'block';
                    _this.activeTab = ((_a = tabs[index].textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'general';
                }
            });
        });
    };
    SettingsUI.prototype.displayCurrentSettings = function () {
        var settings = this.settingsManager.getSettings();
        // Hiển thị cài đặt chung
        this.displayGeneralSettings(settings.general);
        // Hiển thị cài đặt mạng
        this.displayNetworkSettings(settings.network);
        // Hiển thị cài đặt cảm biến
        this.displaySensorSettings(settings.sensors);
        // Hiển thị cài đặt thông báo
        this.displayNotificationSettings(settings.notifications);
    };
    SettingsUI.prototype.displayGeneralSettings = function (general) {
        // Cập nhật các trường input cho tab General
        var nameInput = document.querySelector('input[value="Nhà kính chính"]');
        if (nameInput)
            nameInput.value = general.greenhouseName;
        var locationInput = document.querySelector('input[value="Khu vườn phía Bắc"]');
        if (locationInput)
            locationInput.value = general.location;
        var descriptionInput = document.querySelector('textarea');
        if (descriptionInput)
            descriptionInput.value = general.description;
        // Cập nhật đơn vị nhiệt độ
        var tempUnitInputs = document.querySelectorAll('input[name="temp-unit"]');
        tempUnitInputs.forEach(function (input) {
            var _a;
            var radioInput = input;
            if ((((_a = radioInput.nextElementSibling) === null || _a === void 0 ? void 0 : _a.textContent) || '').includes(general.tempUnit === 'C' ? 'Celsius' : 'Fahrenheit')) {
                radioInput.checked = true;
            }
        });
        // Cập nhật các select
        var dateFormatSelect = document.querySelector('select:nth-of-type(1)');
        if (dateFormatSelect) {
            for (var i = 0; i < dateFormatSelect.options.length; i++) {
                if (dateFormatSelect.options[i].value === general.dateFormat) {
                    dateFormatSelect.selectedIndex = i;
                    break;
                }
            }
        }
        var timeFormatSelect = document.querySelector('select:nth-of-type(2)');
        if (timeFormatSelect) {
            timeFormatSelect.selectedIndex = general.timeFormat === '24h' ? 0 : 1;
        }
        var themeSelect = document.querySelector('select:nth-of-type(3)');
        if (themeSelect) {
            themeSelect.selectedIndex = general.theme === 'light' ? 0 : general.theme === 'dark' ? 1 : 2;
        }
    };
    SettingsUI.prototype.displayNetworkSettings = function (network) {
        // Cập nhật cài đặt WiFi
        var ssidInput = document.querySelector('input[value="Greenhouse_Network"]');
        if (ssidInput)
            ssidInput.value = network.wifi.ssid;
        // Cập nhật trạng thái WiFi
        var wifiStatus = document.querySelector('.status-badge');
        if (wifiStatus) {
            wifiStatus.textContent = network.wifi.status === 'connected' ? 'Đã kết nối' : 'Ngắt kết nối';
            wifiStatus.className = "status-badge ".concat(network.wifi.status);
        }
        // Cập nhật cấu hình IP
        var ipTypeInputs = document.querySelectorAll('input[name="ip-config"]');
        ipTypeInputs.forEach(function (input) {
            var _a;
            var radioInput = input;
            if ((((_a = radioInput.nextElementSibling) === null || _a === void 0 ? void 0 : _a.textContent) || '').includes(network.ip.type === 'dhcp' ? 'DHCP' : 'tĩnh')) {
                radioInput.checked = true;
            }
        });
        // Cập nhật các trường IP
        var ipInputs = document.querySelectorAll('.setting-item input[type="text"][disabled]');
        if (ipInputs.length >= 4) {
            ipInputs[0].value = network.ip.address;
            ipInputs[1].value = network.ip.subnet;
            ipInputs[2].value = network.ip.gateway;
            ipInputs[3].value = network.ip.dns;
        }
        // Cập nhật cài đặt đám mây
        var cloudToggle = document.querySelector('.toggle-switch');
        if (cloudToggle) {
            cloudToggle.classList.toggle('active', network.cloud.enabled);
        }
        var serverInput = document.querySelector('input[value="cloud.greenhouse.io"]');
        if (serverInput)
            serverInput.value = network.cloud.server;
    };
    SettingsUI.prototype.displaySensorSettings = function (sensors) {
        // Sẽ cập nhật trong phần UI khi có tab cảm biến
    };
    SettingsUI.prototype.displayNotificationSettings = function (notifications) {
        // Sẽ cập nhật trong phần UI khi có tab thông báo
    };
    SettingsUI.prototype.initFormEvents = function () {
        var _this = this;
        // Lắng nghe sự kiện nút "Lưu cài đặt"
        var saveButtons = document.querySelectorAll('.save-button');
        saveButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                _this.saveCurrentSettings();
            });
        });
        // Lắng nghe sự kiện nút "Hủy"
        var cancelButtons = document.querySelectorAll('.cancel-button');
        cancelButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                _this.displayCurrentSettings(); // Khôi phục cài đặt hiện tại
            });
        });
        // Thêm sự kiện cho các toggle switch
        var toggleSwitches = document.querySelectorAll('.toggle-switch');
        toggleSwitches.forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                toggle.classList.toggle('active');
            });
        });
        // Thêm sự kiện cho nút xuất/nhập cài đặt
        this.initExportImportEvents();
    };
    SettingsUI.prototype.initExportImportEvents = function () {
        var _this = this;
        // Tìm tab hệ thống
        var systemTab = Array.from(document.querySelectorAll('.tab-button'))
            .find(function (tab) { var _a; return (_a = tab.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('hệ thống'); });
        // Nếu có tab hệ thống, thêm nút xuất/nhập cài đặt
        if (systemTab) {
            var systemCard = document.querySelectorAll('.settings-card')[6]; // Tab thứ 7 (index 6)
            if (systemCard) {
                // Tạo container cho nút xuất/nhập
                var exportImportContainer = document.createElement('div');
                exportImportContainer.className = 'settings-group';
                exportImportContainer.innerHTML = "\n          <h3>Sao l\u01B0u v\u00E0 ph\u1EE5c h\u1ED3i</h3>\n          <div class=\"setting-item\">\n            <label>Xu\u1EA5t c\u00E0i \u0111\u1EB7t</label>\n            <button class=\"action-button export-settings-btn\">Xu\u1EA5t c\u00E0i \u0111\u1EB7t</button>\n          </div>\n          <div class=\"setting-item\">\n            <label>Nh\u1EADp c\u00E0i \u0111\u1EB7t</label>\n            <input type=\"file\" id=\"import-settings-file\" accept=\".json\" style=\"display: none;\" />\n            <button class=\"action-button import-settings-btn\">Nh\u1EADp c\u00E0i \u0111\u1EB7t</button>\n          </div>\n        ";
                // Tìm container các setting
                var settingsContainer = systemCard.querySelector('.settings-container');
                if (settingsContainer) {
                    settingsContainer.appendChild(exportImportContainer);
                    // Thêm sự kiện cho nút xuất cài đặt
                    var exportBtn = exportImportContainer.querySelector('.export-settings-btn');
                    if (exportBtn) {
                        exportBtn.addEventListener('click', function () { return _this.handleExportSettings(); });
                    }
                    // Thêm sự kiện cho nút nhập cài đặt
                    var importBtn = exportImportContainer.querySelector('.import-settings-btn');
                    var importFile_1 = exportImportContainer.querySelector('#import-settings-file');
                    if (importBtn && importFile_1) {
                        importBtn.addEventListener('click', function () { return importFile_1.click(); });
                        importFile_1.addEventListener('change', function (e) { return _this.handleImportSettings(e); });
                    }
                }
            }
        }
    };
    SettingsUI.prototype.handleExportSettings = function () {
        // Xuất cài đặt thành file
        var fileUrl = this.settingsManager.exportSettings();
        // Tạo link tải về
        var downloadLink = document.createElement('a');
        downloadLink.href = fileUrl;
        downloadLink.download = "greenhouse_settings_".concat(new Date().toISOString().slice(0, 10), ".json");
        downloadLink.click();
        // Giải phóng URL
        setTimeout(function () {
            URL.revokeObjectURL(fileUrl);
        }, 100);
        // Hiển thị thông báo
        this.showSuccessMessage('Xuất cài đặt thành công!');
    };
    SettingsUI.prototype.handleImportSettings = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var input, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        input = event.target;
                        if (!(input.files && input.files.length > 0)) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Nhập cài đặt từ file
                        return [4 /*yield*/, this.settingsManager.importSettings(input.files[0])];
                    case 2:
                        // Nhập cài đặt từ file
                        _a.sent();
                        // Hiển thị cài đặt mới
                        this.displayCurrentSettings();
                        // Hiển thị thông báo
                        this.showSuccessMessage('Nhập cài đặt thành công!');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.showErrorMessage("L\u1ED7i: ".concat(error_1 instanceof Error ? error_1.message : 'Không xác định'));
                        return [3 /*break*/, 4];
                    case 4:
                        // Reset input
                        input.value = '';
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SettingsUI.prototype.showSuccessMessage = function (message) {
        // Tạo thông báo
        var notification = document.createElement('div');
        notification.className = 'save-notification success';
        notification.innerHTML = "<i class=\"fas fa-check-circle\"></i> ".concat(message);
        // Thêm vào body
        document.body.appendChild(notification);
        // Hiệu ứng hiển thị
        setTimeout(function () { return notification.classList.add('show'); }, 10);
        // Tự động ẩn sau 3 giây
        setTimeout(function () {
            notification.classList.remove('show');
            setTimeout(function () { return notification.remove(); }, 300);
        }, 3000);
    };
    SettingsUI.prototype.showErrorMessage = function (message) {
        // Tạo thông báo
        var notification = document.createElement('div');
        notification.className = 'save-notification error';
        notification.innerHTML = "<i class=\"fas fa-exclamation-circle\"></i> ".concat(message);
        // Thêm vào body
        document.body.appendChild(notification);
        // Hiệu ứng hiển thị
        setTimeout(function () { return notification.classList.add('show'); }, 10);
        // Tự động ẩn sau 3 giây
        setTimeout(function () {
            notification.classList.remove('show');
            setTimeout(function () { return notification.remove(); }, 300);
        }, 3000);
    };
    SettingsUI.prototype.saveCurrentSettings = function () {
        // Lấy cài đặt hiện tại
        var settings = this.settingsManager.getSettings();
        // Cập nhật cài đặt từ form tùy theo tab đang active
        switch (this.activeTab) {
            case 'general':
                this.saveGeneralSettings(settings);
                break;
            case 'network':
                this.saveNetworkSettings(settings);
                break;
            case 'sensors':
                this.saveSensorSettings(settings);
                break;
            case 'notifications':
                this.saveNotificationSettings(settings);
                break;
        }
        // Hiển thị thông báo thành công
        this.showSaveSuccessMessage();
    };
    SettingsUI.prototype.saveGeneralSettings = function (settings) {
        var _a;
        // Lấy các giá trị từ form
        var nameInput = document.querySelector('input[value="Nhà kính chính"]');
        var locationInput = document.querySelector('input[value="Khu vườn phía Bắc"]');
        var descriptionInput = document.querySelector('textarea');
        // Cập nhật cài đặt
        if (nameInput)
            settings.general.greenhouseName = nameInput.value;
        if (locationInput)
            settings.general.location = locationInput.value;
        if (descriptionInput)
            settings.general.description = descriptionInput.value;
        // Lấy đơn vị nhiệt độ
        var celsiusInput = document.querySelector('input[name="temp-unit"]:checked');
        if (celsiusInput && celsiusInput.nextElementSibling) {
            settings.general.tempUnit = ((_a = celsiusInput.nextElementSibling.textContent) === null || _a === void 0 ? void 0 : _a.includes('Celsius')) ? 'C' : 'F';
        }
        // Lấy định dạng ngày
        var dateFormatSelect = document.querySelector('select:nth-of-type(1)');
        if (dateFormatSelect) {
            settings.general.dateFormat = dateFormatSelect.options[dateFormatSelect.selectedIndex].value;
        }
        // Lấy định dạng giờ
        var timeFormatSelect = document.querySelector('select:nth-of-type(2)');
        if (timeFormatSelect) {
            settings.general.timeFormat = timeFormatSelect.selectedIndex === 0 ? '24h' : '12h';
        }
        // Lấy chủ đề
        var themeSelect = document.querySelector('select:nth-of-type(3)');
        if (themeSelect) {
            var themeValue = themeSelect.selectedIndex;
            settings.general.theme = themeValue === 0 ? 'light' : themeValue === 1 ? 'dark' : 'system';
        }
        // Lưu cài đặt
        this.settingsManager.updateSettings(settings);
    };
    SettingsUI.prototype.saveNetworkSettings = function (settings) {
        var _a;
        // Lấy SSID
        var ssidInput = document.querySelector('input[value="Greenhouse_Network"]');
        if (ssidInput)
            settings.network.wifi.ssid = ssidInput.value;
        // Lấy loại IP
        var dhcpInput = document.querySelector('input[name="ip-config"]:checked');
        if (dhcpInput && dhcpInput.nextElementSibling) {
            settings.network.ip.type = ((_a = dhcpInput.nextElementSibling.textContent) === null || _a === void 0 ? void 0 : _a.includes('DHCP')) ? 'dhcp' : 'static';
        }
        // Lấy trạng thái cloud
        var cloudToggle = document.querySelector('.toggle-switch');
        if (cloudToggle) {
            settings.network.cloud.enabled = cloudToggle.classList.contains('active');
        }
        // Lấy server cloud
        var serverInput = document.querySelector('input[value="cloud.greenhouse.io"]');
        if (serverInput)
            settings.network.cloud.server = serverInput.value;
        // Lưu cài đặt
        this.settingsManager.updateSettings(settings);
    };
    SettingsUI.prototype.saveSensorSettings = function (settings) {
        // Sẽ cập nhật khi có tab cảm biến
        this.settingsManager.updateSettings(settings);
    };
    SettingsUI.prototype.saveNotificationSettings = function (settings) {
        // Sẽ cập nhật khi có tab thông báo
        this.settingsManager.updateSettings(settings);
    };
    SettingsUI.prototype.showSaveSuccessMessage = function () {
        this.showSuccessMessage('Đã lưu cài đặt thành công!');
    };
    return SettingsUI;
}());
// Áp dụng cài đặt chủ đề
function applyTheme() {
    var settingsManager = SettingsManager.getInstance();
    var theme = settingsManager.getSetting('general').theme;
    if (theme === 'system') {
        // Kiểm tra chế độ tối của hệ thống
        var prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDarkMode);
    }
    else {
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }
}
// Khởi tạo khi document đã sẵn sàng
document.addEventListener('DOMContentLoaded', function () {
    // Khởi tạo SettingsUI nếu đang ở trang settings
    if (window.location.pathname.includes('settings.html')) {
        new SettingsUI();
    }
    // Áp dụng chủ đề cho tất cả các trang
    applyTheme();
});
