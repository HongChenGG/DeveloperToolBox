function parseWeatherNumber(value, minimum, maximum, label) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue < minimum || numberValue > maximum) {
        throw new Error(`${label}超出允许范围`);
    }
    return numberValue;
}

function parseWeatherCalendarDate(dateText) {
    const dateMatch = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) throw new Error('天气日期无效');

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const utcDate = new Date(Date.UTC(year, month - 1, day));

    // 使用 UTC 校验并计算日历字段，避免宿主本地时区把 YYYY-MM-DD 提前一天。
    if (utcDate.getUTCFullYear() !== year
        || utcDate.getUTCMonth() !== month - 1
        || utcDate.getUTCDate() !== day) {
        throw new Error('天气日期无效');
    }

    return {
        year,
        month,
        day,
        weekdayIndex: utcDate.getUTCDay()
    };
}

function normalizeWeatherPayload(data) {
    if (!data || typeof data !== 'object') throw new Error('天气响应格式无效');
    if (!Array.isArray(data.current_condition) || data.current_condition.length === 0) {
        throw new Error('天气响应缺少当前天气');
    }
    if (!Array.isArray(data.weather) || data.weather.length === 0 || data.weather.length > 7) {
        throw new Error('天气响应日期数量无效');
    }

    const currentSource = data.current_condition[0];
    const currentCondition = {
        ...currentSource,
        temp_C: parseWeatherNumber(currentSource.temp_C, -100, 100, '当前温度'),
        FeelsLikeC: parseWeatherNumber(currentSource.FeelsLikeC, -100, 100, '体感温度'),
        humidity: parseWeatherNumber(currentSource.humidity, 0, 100, '湿度'),
        windspeedKmph: parseWeatherNumber(currentSource.windspeedKmph, 0, 500, '风速'),
        weatherCode: String(currentSource.weatherCode || '')
    };

    const weather = data.weather.map((day, dayIndex) => {
        if (!day) throw new Error(`第 ${dayIndex + 1} 天天气日期无效`);
        try {
            parseWeatherCalendarDate(day.date);
        } catch (error) {
            throw new Error(`第 ${dayIndex + 1} 天天气日期无效`);
        }
        if (!Array.isArray(day.hourly) || day.hourly.length < 5) throw new Error(`第 ${dayIndex + 1} 天小时预报不足`);

        return {
            ...day,
            maxtempC: parseWeatherNumber(day.maxtempC, -100, 100, '最高温度'),
            mintempC: parseWeatherNumber(day.mintempC, -100, 100, '最低温度'),
            hourly: day.hourly.map((hour, hourIndex) => ({
                ...hour,
                time: String(hour.time ?? hourIndex * 300),
                tempC: parseWeatherNumber(hour.tempC, -100, 100, '小时温度'),
                chanceofrain: parseWeatherNumber(hour.chanceofrain, 0, 100, '降雨概率'),
                weatherCode: String(hour.weatherCode || '')
            }))
        };
    });

    return { ...data, current_condition: [currentCondition], weather };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeWeatherPayload,
        parseWeatherCalendarDate
    };
}

// 天气查询功能 - 使用 wttr.in 免费接口
(function() {
    'use strict';

    let currentCity = '';
    let weatherRequestController = null;
    let weatherRequestSequence = 0;

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
            if (currentCity) {
                fetchWeatherByCity(currentCity);
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

        fetchWeatherByCity(cityName);
    }

    // 使用免费天气API获取天气
    async function fetchWeatherByCity(cityName) {
        weatherRequestController?.abort();
        const requestController = new AbortController();
        weatherRequestController = requestController;
        const requestSequence = ++weatherRequestSequence;
        showLoading(true);

        try {
            const data = await fetchJsonWithTimeout(
                `https://wttr.in/${encodeURIComponent(cityName)}?format=j1&lang=zh`,
                { signal: requestController.signal, timeoutMs: 15000 }
            );
            if (requestSequence !== weatherRequestSequence) return;

            const normalizedData = normalizeWeatherPayload(data);
            currentCity = cityName;
            displayWeather(normalizedData, cityName);
        } catch (error) {
            if (error.code === 'ABORTED' || requestSequence !== weatherRequestSequence) return;
            console.error('天气查询失败:', error);
            showToast('天气查询失败，请检查城市名称或稍后重试', 'error');
        } finally {
            if (requestSequence === weatherRequestSequence) {
                showLoading(false);
                weatherRequestController = null;
            }
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

                const timeElement = document.createElement('div');
                timeElement.style.fontSize = '0.8125rem';
                timeElement.style.color = 'var(--text-secondary)';
                timeElement.style.marginBottom = '0.5rem';
                timeElement.textContent = `${String(hour.time).padStart(4, '0').slice(0, 2)}:00`;

                const emojiElement = document.createElement('div');
                emojiElement.style.fontSize = '1.5rem';
                emojiElement.style.margin = '0.625rem 0';
                emojiElement.textContent = getWeatherEmoji(hour.weatherCode);

                const temperatureElement = document.createElement('div');
                temperatureElement.style.fontSize = '1rem';
                temperatureElement.style.fontWeight = 'bold';
                temperatureElement.style.color = 'var(--text-primary)';
                temperatureElement.textContent = `${hour.tempC}°C`;

                const rainElement = document.createElement('div');
                rainElement.style.fontSize = '0.6875rem';
                rainElement.style.color = 'var(--text-secondary)';
                rainElement.style.marginTop = '0.3125rem';
                rainElement.textContent = `💧 ${hour.chanceofrain}%`;

                hourDiv.append(timeElement, emojiElement, temperatureElement, rainElement);
                hourlyForecast.appendChild(hourDiv);
            }
        });

        // 7天预报
        const dailyForecast = document.getElementById('daily-forecast');
        dailyForecast.innerHTML = '';
        data.weather.forEach((day, index) => {
            const calendarDate = parseWeatherCalendarDate(day.date);
            const dayName = index === 0
                ? '今天'
                : index === 1
                    ? '明天'
                    : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][calendarDate.weekdayIndex];
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'daily-item';

            const dateColumn = document.createElement('div');
            dateColumn.style.flex = '1';
            const dayNameElement = document.createElement('div');
            dayNameElement.style.fontWeight = 'bold';
            dayNameElement.style.color = 'var(--text-primary)';
            dayNameElement.textContent = dayName;
            const dateElement = document.createElement('div');
            dateElement.style.fontSize = '0.75rem';
            dateElement.style.color = 'var(--text-secondary)';
            dateElement.textContent = `${calendarDate.month}/${calendarDate.day}`;
            dateColumn.append(dayNameElement, dateElement);

            const emojiColumn = document.createElement('div');
            emojiColumn.style.flex = '1';
            emojiColumn.style.textAlign = 'center';
            emojiColumn.style.fontSize = '2rem';
            emojiColumn.textContent = getWeatherEmoji(day.hourly[4].weatherCode);

            const descriptionColumn = document.createElement('div');
            descriptionColumn.style.flex = '1';
            descriptionColumn.style.textAlign = 'center';
            descriptionColumn.style.color = 'var(--text-secondary)';
            descriptionColumn.style.fontSize = '0.75rem';
            descriptionColumn.textContent = getWeatherDesc(day.hourly[4].weatherCode);

            const temperatureColumn = document.createElement('div');
            temperatureColumn.style.flex = '1';
            temperatureColumn.style.textAlign = 'center';
            const maxTemperature = document.createElement('span');
            maxTemperature.style.color = 'var(--accent-color)';
            maxTemperature.style.fontWeight = 'bold';
            maxTemperature.textContent = `${day.maxtempC}°`;
            const minTemperature = document.createElement('span');
            minTemperature.style.color = 'var(--text-secondary)';
            minTemperature.textContent = ` / ${day.mintempC}°`;
            temperatureColumn.append(maxTemperature, minTemperature);

            const rainColumn = document.createElement('div');
            rainColumn.style.flex = '1';
            rainColumn.style.textAlign = 'right';
            rainColumn.style.fontSize = '0.75rem';
            rainColumn.style.color = 'var(--text-secondary)';
            rainColumn.textContent = `💧 降雨 ${day.hourly[4].chanceofrain}%`;

            dayDiv.append(dateColumn, emojiColumn, descriptionColumn, temperatureColumn, rainColumn);
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
                    const data = await fetchJsonWithTimeout(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh`,
                        { timeoutMs: 15000 }
                    );
                    if (!data.address || typeof data.address !== 'object') throw new Error('定位响应格式无效');
                    
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
