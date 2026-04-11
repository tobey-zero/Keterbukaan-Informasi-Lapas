(function () {
    'use strict';

    if (window.__displayModeLoaded) return;
    window.__displayModeLoaded = true;

    var AUTO_SCROLL_CLASS = 'table-auto-scroll';
    var SHELL_CLASS = 'display-fit-shell';
    var initialized = false;
    var shell;
    var scrollRunners = [];
    var resizeTimer;
    var refreshTimerId;
    var dataVersionTimerId;
    var latestDataVersion = null;

    function wrapBodyContent() {
        if (document.querySelector('.' + SHELL_CLASS)) {
            shell = document.querySelector('.' + SHELL_CLASS);
            return;
        }

        shell = document.createElement('div');
        shell.className = SHELL_CLASS;

        while (document.body.firstChild) {
            shell.appendChild(document.body.firstChild);
        }

        document.body.appendChild(shell);
    }

    function stopAllScrollRunners() {
        scrollRunners.forEach(function (runner) {
            runner.active = false;
            if (runner.timerId) {
                clearInterval(runner.timerId);
            }
        });
        scrollRunners = [];
    }

    function getAutoScrollHeight(table) {
        var viewportHeight = window.innerHeight || 1080;
        var baseHeight = Math.max(140, Math.min(320, Math.round(viewportHeight * 0.24)));

        if (table.classList.contains('table-remisi')) {
            baseHeight = Math.max(120, Math.min(260, Math.round(viewportHeight * 0.2)));
        }

        if (table.classList.contains('table-pembinaan-detail')) {
            baseHeight = Math.max(180, Math.min(360, Math.round(viewportHeight * 0.28)));
        }

        return baseHeight;
    }

    function getScrollConfig(table) {
        var config = {
            stepPx: 1,
            tickMs: 95,
            pauseBottom: 1800,
            pauseTop: 1400
        };

        if (table.classList.contains('table-remisi')) {
            config.stepPx = 1;
            config.tickMs = 120;
            config.pauseBottom = 2200;
            config.pauseTop = 1700;
        }

        if (table.classList.contains('table-pembinaan-detail')) {
            config.stepPx = 1;
            config.tickMs = 80;
        }

        return config;
    }

    function runAutoScroll(host, table) {
        var runner = {
            active: true
        };
        scrollRunners.push(runner);

        var direction = 1;
        var scrollConfig = getScrollConfig(table);
        var stepPx = scrollConfig.stepPx;
        var tickMs = scrollConfig.tickMs;
        var paused = false;

        function resumeAfter(delay) {
            paused = true;
            setTimeout(function () {
                if (!runner.active) return;
                paused = false;
            }, delay);
        }

        runner.timerId = setInterval(function () {
            if (!runner.active || paused) return;

            var maxScroll = host.scrollHeight - host.clientHeight;
            if (maxScroll <= 2) {
                host.scrollTop = 0;
                return;
            }

            host.scrollTop += direction * stepPx;

            if (host.scrollTop >= maxScroll) {
                host.scrollTop = maxScroll;
                direction = -1;
                resumeAfter(scrollConfig.pauseBottom);
            } else if (host.scrollTop <= 0) {
                host.scrollTop = 0;
                direction = 1;
                resumeAfter(scrollConfig.pauseTop);
            }
        }, tickMs);
    }

    function prepareTables() {
        stopAllScrollRunners();

        var tables = shell.querySelectorAll('table');
        tables.forEach(function (table) {
            var host = table.parentElement;

            if (!host.classList.contains(AUTO_SCROLL_CLASS)) {
                var wrapper = document.createElement('div');
                wrapper.className = AUTO_SCROLL_CLASS;
                host.insertBefore(wrapper, table);
                wrapper.appendChild(table);
                host = wrapper;
            }

            host.style.height = '100%';
            host.style.maxHeight = '100%';

            runAutoScroll(host, table);
        });
    }

    function fitToScreen() {
        if (!shell) return;
        if (document.hidden) return;

        shell.style.transform = 'none';
        shell.style.left = '0px';
        shell.style.top = '0px';
        shell.style.width = window.innerWidth + 'px';
        shell.style.height = window.innerHeight + 'px';

        var contentRect = shell.getBoundingClientRect();
        var contentWidth = Math.ceil(contentRect.width);
        var contentHeight = Math.ceil(contentRect.height);
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        if (vw < 320 || vh < 240 || contentWidth <= 0 || contentHeight <= 0) {
            return;
        }

        var heightScale = vh / contentHeight;
        var maxScale = 1.35;
        var scale = Math.min(heightScale, maxScale);

        shell.style.transform = 'scale(' + scale + ')';

        var scaledWidth = contentWidth * scale;
        var scaledHeight = contentHeight * scale;

        var left = Math.max((vw - scaledWidth) / 2, 0);
        var top = Math.max((vh - scaledHeight) / 2, 0);

        shell.style.left = left + 'px';
        shell.style.top = top + 'px';
    }

    function fetchPublicDataVersion() {
        return fetch('/api/public-data-version?_=' + Date.now(), { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) return null;
                return response.json();
            })
            .then(function (payload) {
                if (!payload || typeof payload.version !== 'number') return null;
                return payload.version;
            })
            .catch(function () {
                return null;
            });
    }

    function startDataVersionWatcher() {
        fetchPublicDataVersion().then(function (version) {
            if (version !== null) {
                latestDataVersion = version;
            }
        });

        dataVersionTimerId = setInterval(function () {
            if (document.hidden) return;

            fetchPublicDataVersion().then(function (version) {
                if (version === null) return;

                if (latestDataVersion === null) {
                    latestDataVersion = version;
                    return;
                }

                if (version > latestDataVersion) {
                    window.location.reload();
                    return;
                }

                latestDataVersion = version;
            });
        }, 8000);
    }

    function initializeDisplayMode() {
        if (initialized) return;
        initialized = true;

        document.body.classList.add('display-mode');
        wrapBodyContent();
        prepareTables();
        fitToScreen();
        startDataVersionWatcher();

        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                prepareTables();
                fitToScreen();
            }, 180);
        });

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) return;
            setTimeout(function () {
                fitToScreen();
            }, 120);
        });

        window.addEventListener('focus', function () {
            setTimeout(function () {
                fitToScreen();
            }, 120);
        });

        document.addEventListener('fullscreenchange', function () {
            setTimeout(function () {
                fitToScreen();
            }, 120);
        });

        function scheduleAutoRefresh() {
            if (refreshTimerId) {
                clearTimeout(refreshTimerId);
            }

            if (document.hidden) {
                return;
            }

            refreshTimerId = setTimeout(function () {
                if (!document.hidden) {
                    window.location.reload();
                }
            }, 60000);
        }

        document.addEventListener('visibilitychange', scheduleAutoRefresh);
        window.addEventListener('focus', scheduleAutoRefresh);
        window.addEventListener('blur', function () {
            if (refreshTimerId) {
                clearTimeout(refreshTimerId);
            }
        });

        scheduleAutoRefresh();

        setInterval(function () {
            fitToScreen();
        }, 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDisplayMode);
    } else {
        initializeDisplayMode();
    }
})();
