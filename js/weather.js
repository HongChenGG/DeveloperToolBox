// 天气查询功能 - 使用高德天气API（免费）
(function() {
    'use strict';
    
    // 高德地图API Key（需要注册获取）
    // 这里使用的是示例Key，实际使用需要替换
    const AMAP_KEY = '56a6bed44e5fbc1d4c42349c0fa2947e'; // 用户需要自己申请
    
    let currentCity = '';
    let currentAdcode = '';

    function init() {
        bindEvents();
    }

    function bindEvents() {
        // 搜索城市
        document.getElementById('btn-search-city')?.addEventListener('click', searchCity);
        document.getElementById('city-select')?.addEventListener('change', (e) => {
            if (e.target.value) {
                searchCity();
            }
        });

        // 自动定位
        document.getElementById('btn-get-location')?.addEventListener('click', getLocation);

        // 刷新天气
        document.getElementById('btn-refresh-weather')?.addEventListener('click', () => {
            if (currentAdcode) {
                getWeather(currentAdcode);
            } else {
                showToast('请先查询城市天气', 'warning');
            }
        });
    }

    // 搜索城市
    function searchCity() {
        const cityName = document.getElementById('city-select').value.trim();
        if (!cityName) {
            showToast('请选择城市', 'warning');
            return;
        }

        showLoading(true);
        
        // 使用免费的天气API - OpenWeatherMap
        // 注意：这里使用的是示例，实际需要申请API Key
        fetchWeatherByCity(cityName);
    }

    // 使用免费天气API获取天气
    async function fetchWeatherByCity(cityName) {
        try {
            // 使用wttr.in - 免费的天气API，无需Key
            const response = await fetch(`https://wttr.in/${encodeURIComponent(cityName)}?format=j1&lang=zh`);
            
            if (!response.ok) {
                throw new Error('获取天气失败');
            }

            const data = await response.json();
            displayWeather(data, cityName);
            showLoading(false);
        } catch (error) {
            console.error('天气查询失败:', error);
            showToast('天气查询失败，请检查城市名称或稍后重试', 'error');
            showLoading(false);
        }
    }

    // 显示天气信息
    function displayWeather(data, cityName) {
        const current = data.current_condition[0];
        const today = data.weather[0];

        // 更新当前天气
        document.getElementById('weather-city').textContent = cityName;
        document.getElementById('weather-update-time').textContent = `更新时间：${new Date().toLocaleString('zh-CN')}`;
        document.getElementById('weather-temp').textContent = `${current.temp_C}°C`;
        
        // 分析降雨预报
        const rainForecast = analyzeRainForecast(today.hourly);
        let conditionText = getWeatherDesc(current.weatherCode);
        if (rainForecast) {
            conditionText += ` · ${rainForecast}`;
        }
        document.getElementById('weather-condition').textContent = conditionText;
        
        document.getElementById('weather-feels-like').textContent = `${current.FeelsLikeC}°C`;
        document.getElementById('weather-humidity').textContent = `${current.humidity}%`;
        document.getElementById('weather-wind').textContent = `${current.windspeedKmph} km/h`;

        // 24小时预报
        const hourlyForecast = document.getElementById('hourly-forecast');
        hourlyForecast.innerHTML = '';
        today.hourly.forEach((hour, index) => {
            if (index % 3 === 0) { // 每3小时显示一次
                const hourDiv = document.createElement('div');
                hourDiv.className = 'hourly-item';
                hourDiv.innerHTML = `
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${hour.time.padStart(4, '0').slice(0, 2)}:00</div>
                    <div style="font-size: 24px; margin: 10px 0;">${getWeatherEmoji(hour.weatherCode)}</div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-primary);">${hour.tempC}°C</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 5px;">💧 ${hour.chanceofrain}%</div>
                `;
                hourlyForecast.appendChild(hourDiv);
            }
        });

        // 7天预报
        const dailyForecast = document.getElementById('daily-forecast');
        dailyForecast.innerHTML = '';
        data.weather.forEach((day, index) => {
            const date = new Date(day.date);
            const dayName = index === 0 ? '今天' : index === 1 ? '明天' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'daily-item';
            dayDiv.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--text-primary);">${dayName}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${date.getMonth() + 1}/${date.getDate()}</div>
                </div>
                <div style="flex: 1; text-align: center; font-size: 32px;">${getWeatherEmoji(day.hourly[4].weatherCode)}</div>
                <div style="flex: 1; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 12px;">${getWeatherDesc(day.hourly[4].weatherCode)}</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <span style="color: var(--accent-color); font-weight: bold;">${day.maxtempC}°</span>
                    <span style="color: var(--text-secondary);"> / ${day.mintempC}°</span>
                </div>
                <div style="flex: 1; text-align: right;">
                    <div style="font-size: 12px; color: var(--text-secondary);">💧 降雨 ${day.hourly[4].chanceofrain}%</div>
                </div>
            `;
            dailyForecast.appendChild(dayDiv);
        });

        // 显示天气信息
        document.getElementById('weather-placeholder').style.display = 'none';
        document.getElementById('weather-info').style.display = 'block';
    }

    // 分析降雨预报
    function analyzeRainForecast(hourlyData) {
        const now = new Date();
        const currentHour = now.getHours();
        
        for (let i = 0; i < hourlyData.length; i++) {
            const hour = hourlyData[i];
            const hourTime = parseInt(hour.time) / 100;
            const rainChance = parseInt(hour.chanceofrain);
            
            // 只检查未来的小时
            if (hourTime > currentHour && rainChance > 50) {
                const hoursUntilRain = hourTime - currentHour;
                const minutesUntilRain = hoursUntilRain * 60;
                
                if (minutesUntilRain <= 60) {
                    return `⚠️ ${Math.round(minutesUntilRain)}分钟后可能下雨`;
                } else if (hoursUntilRain <= 3) {
                    return `⚠️ ${Math.round(hoursUntilRain)}小时后可能下雨`;
                } else if (hoursUntilRain <= 6) {
                    return `🌂 今天可能下雨`;
                }
            }
        }
        
        // 检查是否正在下雨
        const currentRain = parseInt(hourlyData[0].chanceofrain);
        if (currentRain > 70) {
            return '🌧️ 正在下雨';
        }
        
        return null;
    }

    // 获取天气描述
    function getWeatherDesc(code) {
        const weatherMap = {
            '113': '晴天',
            '116': '多云',
            '119': '阴天',
            '122': '阴天',
            '143': '雾',
            '176': '小雨',
            '179': '小雪',
            '182': '雨夹雪',
            '185': '雨夹雪',
            '200': '雷阵雨',
            '227': '暴风雪',
            '230': '暴风雪',
            '248': '雾',
            '260': '雾',
            '263': '小雨',
            '266': '小雨',
            '281': '雨夹雪',
            '284': '雨夹雪',
            '293': '小雨',
            '296': '小雨',
            '299': '中雨',
            '302': '中雨',
            '305': '大雨',
            '308': '大雨',
            '311': '雨夹雪',
            '314': '雨夹雪',
            '317': '雨夹雪',
            '320': '雨夹雪',
            '323': '小雪',
            '326': '小雪',
            '329': '中雪',
            '332': '中雪',
            '335': '大雪',
            '338': '大雪',
            '350': '冰雹',
            '353': '小雨',
            '356': '中雨',
            '359': '大雨',
            '362': '雨夹雪',
            '365': '雨夹雪',
            '368': '小雪',
            '371': '中雪',
            '374': '冰雹',
            '377': '冰雹',
            '386': '雷阵雨',
            '389': '雷阵雨',
            '392': '雷阵雨',
            '395': '暴雪'
        };
        return weatherMap[code] || '未知';
    }

    // 获取天气Emoji
    function getWeatherEmoji(code) {
        const emojiMap = {
            '113': '☀️',
            '116': '⛅',
            '119': '☁️',
            '122': '☁️',
            '143': '🌫️',
            '176': '🌦️',
            '179': '🌨️',
            '182': '🌨️',
            '185': '🌨️',
            '200': '⛈️',
            '227': '❄️',
            '230': '❄️',
            '248': '🌫️',
            '260': '🌫️',
            '263': '🌦️',
            '266': '🌦️',
            '281': '🌨️',
            '284': '🌨️',
            '293': '🌦️',
            '296': '🌦️',
            '299': '🌧️',
            '302': '🌧️',
            '305': '🌧️',
            '308': '🌧️',
            '311': '🌨️',
            '314': '🌨️',
            '317': '🌨️',
            '320': '🌨️',
            '323': '🌨️',
            '326': '🌨️',
            '329': '🌨️',
            '332': '🌨️',
            '335': '❄️',
            '338': '❄️',
            '350': '🧊',
            '353': '🌦️',
            '356': '🌧️',
            '359': '🌧️',
            '362': '🌨️',
            '365': '🌨️',
            '368': '🌨️',
            '371': '🌨️',
            '374': '🧊',
            '377': '🧊',
            '386': '⛈️',
            '389': '⛈️',
            '392': '⛈️',
            '395': '❄️'
        };
        return emojiMap[code] || '🌡️';
    }

    // 自动定位
    function getLocation() {
        if (!navigator.geolocation) {
            showToast('浏览器不支持定位功能', 'error');
            return;
        }

        showLoading(true);
        showToast('正在获取位置...', 'info');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // 使用反向地理编码获取城市名
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh`);
                    const data = await response.json();
                    
                    let city = data.address.city || data.address.town || data.address.county || data.address.state;
                    
                    // 尝试匹配下拉框中的城市
                    const citySelect = document.getElementById('city-select');
                    const options = citySelect.querySelectorAll('option');
                    let matched = false;
                    
                    for (let option of options) {
                        if (option.value && city.includes(option.value)) {
                            citySelect.value = option.value;
                            city = option.value;
                            matched = true;
                            break;
                        }
                    }
                    
                    if (!matched) {
                        // 如果没有匹配到，尝试使用省会城市
                        const province = data.address.state;
                        for (let option of options) {
                            if (option.value && province && province.includes(option.value.substring(0, 2))) {
                                citySelect.value = option.value;
                                city = option.value;
                                matched = true;
                                break;
                            }
                        }
                    }
                    
                    if (matched) {
                        fetchWeatherByCity(city);
                    } else {
                        showToast(`定位到${city}，但不在支持列表中，请手动选择附近城市`, 'warning');
                        showLoading(false);
                    }
                } catch (error) {
                    console.error('定位失败:', error);
                    showToast('定位失败，请手动输入城市', 'error');
                    showLoading(false);
                }
            },
            (error) => {
                console.error('定位错误:', error);
                showToast('定位失败，请检查浏览器权限或手动输入城市', 'error');
                showLoading(false);
            }
        );
    }

    // 显示/隐藏加载状态
    function showLoading(show) {
        document.getElementById('weather-loading').style.display = show ? 'block' : 'none';
        document.getElementById('weather-placeholder').style.display = show ? 'none' : (document.getElementById('weather-info').style.display === 'none' ? 'block' : 'none');
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
