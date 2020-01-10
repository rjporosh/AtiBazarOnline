(function(modules) {
	var parentHotUpdateCallback = this["webpackHotUpdate"];
	this["webpackHotUpdate"] = function webpackHotUpdateCallback(chunkId, moreModules) {
		hotAddUpdateChunk(chunkId, moreModules);
		if (parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
	}

	function hotDownloadUpdateChunk(chunkId) {
		var head = document.getElementsByTagName("head")[0];
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.charset = "utf-8";
		script.src = __webpack_require__.p + "" + chunkId + "." + hotCurrentHash + ".hot-update.js";
		head.appendChild(script);
	}

	function hotDownloadManifest(callback) {
		if (typeof XMLHttpRequest === "undefined") return callback(new Error("No browser support"));
		try {
			var request = new XMLHttpRequest();
			var requestPath = __webpack_require__.p + "" + hotCurrentHash + ".hot-update.json";
			request.open("GET", requestPath, true);
			request.timeout = 10000;
			request.send(null);
		} catch (err) {
			return callback(err);
		}
		request.onreadystatechange = function() {
			if (request.readyState !== 4) return;
			if (request.status === 0) {
				callback(new Error("Manifest request to " + requestPath + " timed out."));
			} else if (request.status === 404) {
				callback();
			} else if (request.status !== 200 && request.status !== 304) {
				callback(new Error("Manifest request to " + requestPath + " failed."));
			} else {
				try {
					var update = JSON.parse(request.responseText);
				} catch (e) {
					callback(e);
					return;
				}
				callback(null, update);
			}
		};
	}
	var hotApplyOnUpdate = true;
	var hotCurrentHash = "ecdba482a24a3d285278";
	var hotCurrentModuleData = {};
	var hotCurrentParents = [];
	function hotCreateRequire(moduleId) {
		var me = installedModules[moduleId];
		if (!me) return __webpack_require__;
		var fn = function(request) {
			if (me.hot.active) {
				if (installedModules[request]) {
					if (installedModules[request].parents.indexOf(moduleId) < 0) installedModules[request].parents.push(moduleId);
					if (me.children.indexOf(request) < 0) me.children.push(request);
				} else hotCurrentParents = [moduleId];
			} else {
				console.warn("[HMR] unexpected require(" + request + ") from disposed module " + moduleId);
				hotCurrentParents = [];
			}
			return __webpack_require__(request);
		};
		for (var name in __webpack_require__) {
			if (Object.prototype.hasOwnProperty.call(__webpack_require__, name)) {
				if (Object.defineProperty) {
					Object.defineProperty(fn, name, (function(name) {
						return {
							configurable: true,
							enumerable: true,
							get: function() {
								return __webpack_require__[name];
							},
							set: function(value) {
								__webpack_require__[name] = value;
							}
						};
					}(name)));
				} else {
					fn[name] = __webpack_require__[name];
				}
			}
		}

		function ensure(chunkId, callback) {
			if (hotStatus === "ready") hotSetStatus("prepare");
			hotChunksLoading++;
			__webpack_require__.e(chunkId, function() {
				try {
					callback.call(null, fn);
				} finally {
					finishChunkLoading();
				}

				function finishChunkLoading() {
					hotChunksLoading--;
					if (hotStatus === "prepare") {
						if (!hotWaitingFilesMap[chunkId]) {
							hotEnsureUpdateChunk(chunkId);
						}
						if (hotChunksLoading === 0 && hotWaitingFiles === 0) {
							hotUpdateDownloaded();
						}
					}
				}
			});
		}
		if (Object.defineProperty) {
			Object.defineProperty(fn, "e", {
				enumerable: true,
				value: ensure
			});
		} else {
			fn.e = ensure;
		}
		return fn;
	}

	function hotCreateModule(moduleId) {
		var hot = {
			_acceptedDependencies: {},
			_declinedDependencies: {},
			_selfAccepted: false,
			_selfDeclined: false,
			_disposeHandlers: [],
			active: true,
			accept: function(dep, callback) {
				if (typeof dep === "undefined") hot._selfAccepted = true;
				else if (typeof dep === "function") hot._selfAccepted = dep;
				else if (typeof dep === "object") for (var i = 0; i < dep.length; i++)
				hot._acceptedDependencies[dep[i]] = callback;
				else
				hot._acceptedDependencies[dep] = callback;
			},
			decline: function(dep) {
				if (typeof dep === "undefined") hot._selfDeclined = true;
				else if (typeof dep === "number") hot._declinedDependencies[dep] = true;
				else
				for (var i = 0; i < dep.length; i++)
				hot._declinedDependencies[dep[i]] = true;
			},
			dispose: function(callback) {
				hot._disposeHandlers.push(callback);
			},
			addDisposeHandler: function(callback) {
				hot._disposeHandlers.push(callback);
			},
			removeDisposeHandler: function(callback) {
				var idx = hot._disposeHandlers.indexOf(callback);
				if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
			},
			check: hotCheck,
			apply: hotApply,
			status: function(l) {
				if (!l) return hotStatus;
				hotStatusHandlers.push(l);
			},
			addStatusHandler: function(l) {
				hotStatusHandlers.push(l);
			},
			removeStatusHandler: function(l) {
				var idx = hotStatusHandlers.indexOf(l);
				if (idx >= 0) hotStatusHandlers.splice(idx, 1);
			},
			data: hotCurrentModuleData[moduleId]
		};
		return hot;
	}
	var hotStatusHandlers = [];
	var hotStatus = "idle";
	function hotSetStatus(newStatus) {
		hotStatus = newStatus;
		for (var i = 0; i < hotStatusHandlers.length; i++)
		hotStatusHandlers[i].call(null, newStatus);
	}
	var hotWaitingFiles = 0;
	var hotChunksLoading = 0;
	var hotWaitingFilesMap = {};
	var hotRequestedFilesMap = {};
	var hotAvailibleFilesMap = {};
	var hotCallback;
	var hotUpdate, hotUpdateNewHash;
	function toModuleId(id) {
		var isNumber = (+id) + "" === id;
		return isNumber ? +id : id;
	}

	function hotCheck(apply, callback) {
		if (hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
		if (typeof apply === "function") {
			hotApplyOnUpdate = false;
			callback = apply;
		} else {
			hotApplyOnUpdate = apply;
			callback = callback ||
			function(err) {
				if (err) throw err;
			};
		}
		hotSetStatus("check");
		hotDownloadManifest(function(err, update) {
			if (err) return callback(err);
			if (!update) {
				hotSetStatus("idle");
				callback(null, null);
				return;
			}
			hotRequestedFilesMap = {};
			hotAvailibleFilesMap = {};
			hotWaitingFilesMap = {};
			for (var i = 0; i < update.c.length; i++)
			hotAvailibleFilesMap[update.c[i]] = true;
			hotUpdateNewHash = update.h;
			hotSetStatus("prepare");
			hotCallback = callback;
			hotUpdate = {};
			var chunkId = 0; {
				hotEnsureUpdateChunk(chunkId);
			}
			if (hotStatus === "prepare" && hotChunksLoading === 0 && hotWaitingFiles === 0) {
				hotUpdateDownloaded();
			}
		});
	}

	function hotAddUpdateChunk(chunkId, moreModules) {
		if (!hotAvailibleFilesMap[chunkId] || !hotRequestedFilesMap[chunkId]) return;
		hotRequestedFilesMap[chunkId] = false;
		for (var moduleId in moreModules) {
			if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
				hotUpdate[moduleId] = moreModules[moduleId];
			}
		}
		if (--hotWaitingFiles === 0 && hotChunksLoading === 0) {
			hotUpdateDownloaded();
		}
	}

	function hotEnsureUpdateChunk(chunkId) {
		if (!hotAvailibleFilesMap[chunkId]) {
			hotWaitingFilesMap[chunkId] = true;
		} else {
			hotRequestedFilesMap[chunkId] = true;
			hotWaitingFiles++;
			hotDownloadUpdateChunk(chunkId);
		}
	}

	function hotUpdateDownloaded() {
		hotSetStatus("ready");
		var callback = hotCallback;
		hotCallback = null;
		if (!callback) return;
		if (hotApplyOnUpdate) {
			hotApply(hotApplyOnUpdate, callback);
		} else {
			var outdatedModules = [];
			for (var id in hotUpdate) {
				if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
					outdatedModules.push(toModuleId(id));
				}
			}
			callback(null, outdatedModules);
		}
	}

	function hotApply(options, callback) {
		if (hotStatus !== "ready") throw new Error("apply() is only allowed in ready status");
		if (typeof options === "function") {
			callback = options;
			options = {};
		} else if (options && typeof options === "object") {
			callback = callback ||
			function(err) {
				if (err) throw err;
			};
		} else {
			options = {};
			callback = callback ||
			function(err) {
				if (err) throw err;
			};
		}

		function getAffectedStuff(module) {
			var outdatedModules = [module];
			var outdatedDependencies = {};
			var queue = outdatedModules.slice();
			while (queue.length > 0) {
				var moduleId = queue.pop();
				var module = installedModules[moduleId];
				if (!module || module.hot._selfAccepted) continue;
				if (module.hot._selfDeclined) {
					return new Error("Aborted because of self decline: " + moduleId);
				}
				if (moduleId === 0) {
					return;
				}
				for (var i = 0; i < module.parents.length; i++) {
					var parentId = module.parents[i];
					var parent = installedModules[parentId];
					if (parent.hot._declinedDependencies[moduleId]) {
						return new Error("Aborted because of declined dependency: " + moduleId + " in " + parentId);
					}
					if (outdatedModules.indexOf(parentId) >= 0) continue;
					if (parent.hot._acceptedDependencies[moduleId]) {
						if (!outdatedDependencies[parentId]) outdatedDependencies[parentId] = [];
						addAllToSet(outdatedDependencies[parentId], [moduleId]);
						continue;
					}
					delete outdatedDependencies[parentId];
					outdatedModules.push(parentId);
					queue.push(parentId);
				}
			}
			return [outdatedModules, outdatedDependencies];
		}

		function addAllToSet(a, b) {
			for (var i = 0; i < b.length; i++) {
				var item = b[i];
				if (a.indexOf(item) < 0) a.push(item);
			}
		}
		var outdatedDependencies = {};
		var outdatedModules = [];
		var appliedUpdate = {};
		for (var id in hotUpdate) {
			if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
				var moduleId = toModuleId(id);
				var result = getAffectedStuff(moduleId);
				if (!result) {
					if (options.ignoreUnaccepted) continue;
					hotSetStatus("abort");
					return callback(new Error("Aborted because " + moduleId + " is not accepted"));
				}
				if (result instanceof Error) {
					hotSetStatus("abort");
					return callback(result);
				}
				appliedUpdate[moduleId] = hotUpdate[moduleId];
				addAllToSet(outdatedModules, result[0]);
				for (var moduleId in result[1]) {
					if (Object.prototype.hasOwnProperty.call(result[1], moduleId)) {
						if (!outdatedDependencies[moduleId]) outdatedDependencies[moduleId] = [];
						addAllToSet(outdatedDependencies[moduleId], result[1][moduleId]);
					}
				}
			}
		}
		var outdatedSelfAcceptedModules = [];
		for (var i = 0; i < outdatedModules.length; i++) {
			var moduleId = outdatedModules[i];
			if (installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted) outdatedSelfAcceptedModules.push({
				module: moduleId,
				errorHandler: installedModules[moduleId].hot._selfAccepted
			});
		}
		hotSetStatus("dispose");
		var queue = outdatedModules.slice();
		while (queue.length > 0) {
			var moduleId = queue.pop();
			var module = installedModules[moduleId];
			if (!module) continue;
			var data = {};
			var disposeHandlers = module.hot._disposeHandlers;
			for (var j = 0; j < disposeHandlers.length; j++) {
				var cb = disposeHandlers[j];
				cb(data);
			}
			hotCurrentModuleData[moduleId] = data;
			module.hot.active = false;
			delete installedModules[moduleId];
			for (var j = 0; j < module.children.length; j++) {
				var child = installedModules[module.children[j]];
				if (!child) continue;
				var idx = child.parents.indexOf(moduleId);
				if (idx >= 0) {
					child.parents.splice(idx, 1);
				}
			}
		}
		for (var moduleId in outdatedDependencies) {
			if (Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
				var module = installedModules[moduleId];
				var moduleOutdatedDependencies = outdatedDependencies[moduleId];
				for (var j = 0; j < moduleOutdatedDependencies.length; j++) {
					var dependency = moduleOutdatedDependencies[j];
					var idx = module.children.indexOf(dependency);
					if (idx >= 0) module.children.splice(idx, 1);
				}
			}
		}
		hotSetStatus("apply");
		hotCurrentHash = hotUpdateNewHash;
		for (var moduleId in appliedUpdate) {
			if (Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
				modules[moduleId] = appliedUpdate[moduleId];
			}
		}
		var error = null;
		for (var moduleId in outdatedDependencies) {
			if (Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
				var module = installedModules[moduleId];
				var moduleOutdatedDependencies = outdatedDependencies[moduleId];
				var callbacks = [];
				for (var i = 0; i < moduleOutdatedDependencies.length; i++) {
					var dependency = moduleOutdatedDependencies[i];
					var cb = module.hot._acceptedDependencies[dependency];
					if (callbacks.indexOf(cb) >= 0) continue;
					callbacks.push(cb);
				}
				for (var i = 0; i < callbacks.length; i++) {
					var cb = callbacks[i];
					try {
						cb(outdatedDependencies);
					} catch (err) {
						if (!error) error = err;
					}
				}
			}
		}
		for (var i = 0; i < outdatedSelfAcceptedModules.length; i++) {
			var item = outdatedSelfAcceptedModules[i];
			var moduleId = item.module;
			hotCurrentParents = [moduleId];
			try {
				__webpack_require__(moduleId);
			} catch (err) {
				if (typeof item.errorHandler === "function") {
					try {
						item.errorHandler(err);
					} catch (err) {
						if (!error) error = err;
					}
				} else if (!error) error = err;
			}
		}
		if (error) {
			hotSetStatus("fail");
			return callback(error);
		}
		hotSetStatus("idle");
		callback(null, outdatedModules);
	}
	var installedModules = {};
	function __webpack_require__(moduleId) {
		if (installedModules[moduleId]) return installedModules[moduleId].exports;
		var module = installedModules[moduleId] = {
			exports: {},
			id: moduleId,
			loaded: false,
			hot: hotCreateModule(moduleId),
			parents: hotCurrentParents,
			children: []
		};
		modules[moduleId].call(module.exports, module, module.exports, hotCreateRequire(moduleId));
		module.loaded = true;
		return module.exports;
	}
	__webpack_require__.m = modules;
	__webpack_require__.c = installedModules;
	__webpack_require__.p = "js/";
	__webpack_require__.h = function() {
		return hotCurrentHash;
	};
	return hotCreateRequire(0)(0);
})([function(module, exports, __webpack_require__) {
	module.exports = __webpack_require__(1);
}, function(module, exports, __webpack_require__) {
	console.log('app.js has loaded!');
	(function($) {
		"use strict";
		const googleMaps = __webpack_require__(2);
		const photoSwipe = __webpack_require__(3);
		const customFunctions = __webpack_require__(4);
		const customScrollbar = __webpack_require__(5);
		const submitFunctions = __webpack_require__(6);
		const clickFunctions = __webpack_require__(7);
		const scrollFunctions = __webpack_require__(9);
		const sliders = __webpack_require__(10);
		const isotope = __webpack_require__(11);
		const postsLoad = __webpack_require__(12);
		const videoPlayer = __webpack_require__(13);
		const functions = __webpack_require__(8);
		const datepicker = __webpack_require__(14);
		$(document).ready(function() {
			photoSwipe();
			customFunctions();
			videoPlayer();
			datepicker();
			functions.setPostHeight();
			functions.setRatingStars();
		});
		$(window).on('load', function() {
			$('html, body').animate({
				scrollTop: 0
			}, 10);
			customScrollbar();
			isotope();
			sliders();
			functions.setGalleryThumbs();
			functions.setDateHeight();
			functions.setFooter();
			if (window.outerWidth > 991) {
				if ($("*").is('.baron__clipper')) {
					baron({
						root: '.baron__clipper',
						scroller: '.baron__scroller',
						bar: '.baron__bar',
						scrollingCls: '_scrolling',
						draggingCls: '_dragging'
					});
				}
				if ($("*").is('.faq-list-wrapper .baron__clipper')) {
					baron({
						root: '.faq-list-wrapper .baron__clipper',
						scroller: '.faq-list-wrapper .baron__scroller',
						bar: '.faq-list-wrapper .baron__bar',
						scrollingCls: '_scrolling',
						draggingCls: '_dragging'
					});
				}
				$('.baron__clipper').each(function(item) {
					if ($(this).find('.baron__bar').height() >= $(this).height()) {
						$(this).find('.baron__bar').addClass('hidden')
					} else {
						$(this).find('.baron__bar').removeClass('hidden')
					}
				})
			}
			$('.news-container .news-content .post.post-gallery, .blog-post .images-gallery').each(function() {
				$(this).find('.owl-carousel .owl-thumbs-body .owl-thumbs .owl-thumb-item').eq(1).click();
				$(this).find('.owl-carousel .owl-thumbs-body .owl-thumbs .owl-thumb-item').eq(0).click();
			});
		});
		$(window).on('resize', function() {
			functions.setPostHeight();
			functions.setDateHeight();
			functions.setSticky('refresh');
			functions.setFooter();
		});
		$('.selectpicker').selectpicker();
		googleMaps();
		sliders();
		submitFunctions();
		clickFunctions();
		scrollFunctions();
		postsLoad();
		if (document.querySelector('#news-stories') !== null) {
			new WOW().init();
		}
	})(jQuery);
}, function(module, exports) {
	module.exports = function() {
		let map;
		function initialize() {
			let locations = [{
				lat: 151.208296,
				lon: -33.883891,
			}, ];
			let options = {
				zoom: 16,
				center: new google.maps.LatLng(locations[0].lon, locations[0].lat),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				scrollwheel: false,
				mapTypeControl: false,
				streetViewControl: false,
				zoomControl: true,
				zoomControlOptions: {
					position: google.maps.ControlPosition.TOP_RIGHT
				}
			};
			map = new google.maps.Map(document.getElementById('map'), options);
			let marker, i;
			for (i = 0; i < locations.length; i++) {
				marker = new google.maps.Marker({
					position: new google.maps.LatLng(locations[i].lon, locations[i].lat),
					map: map,
				});
			}
		}
		if ($('#map').length) {
			google.maps.event.addDomListener(window, 'load', initialize);
		}
	};
}, function(module, exports) {
	module.exports = function() {
		var initPhotoSwipeFromDOM = function(gallerySelector) {
			var parseThumbnailElements = function(el) {
				var thumbElements = el.childNodes,
					numNodes = thumbElements.length,
					items = [],
					figureEl, linkEl, size, item;
				for (var i = 0; i < numNodes; i++) {
					figureEl = thumbElements[i];
					if (figureEl.nodeType !== 1) {
						continue;
					}
					linkEl = figureEl.children[0];
					size = linkEl.getAttribute('data-size').split('x');
					item = {
						src: linkEl.getAttribute('href'),
						w: parseInt(size[0], 10),
						h: parseInt(size[1], 10)
					};
					if (figureEl.children.length > 1) {
						item.title = figureEl.children[1].innerHTML;
					}
					if (linkEl.children.length > 0) {
						item.msrc = linkEl.children[0].getAttribute('src');
					}
					item.el = figureEl;
					items.push(item);
				}
				return items;
			};
			var closest = function closest(el, fn) {
				return el && (fn(el) ? el : closest(el.parentNode, fn));
			};
			var onThumbnailsClick = function(e) {
				e = e || window.event;
				e.preventDefault ? e.preventDefault() : e.returnValue = false;
				var eTarget = e.target || e.srcElement;
				var clickedListItem = closest(eTarget, function(el) {
					return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
				});
				if (!clickedListItem) {
					return;
				}
				var clickedGallery = clickedListItem.parentNode,
					childNodes = clickedListItem.parentNode.childNodes,
					numChildNodes = childNodes.length,
					nodeIndex = 0,
					index;
				for (var i = 0; i < numChildNodes; i++) {
					if (childNodes[i].nodeType !== 1) {
						continue;
					}
					if (childNodes[i] === clickedListItem) {
						index = nodeIndex;
						break;
					}
					nodeIndex++;
				}
				if (index >= 0) {
					openPhotoSwipe(index, clickedGallery);
				}
				return false;
			};
			var photoswipeParseHash = function() {
				var hash = window.location.hash.substring(1),
					params = {};
				if (hash.length < 5) {
					return params;
				}
				var vars = hash.split('&');
				for (var i = 0; i < vars.length; i++) {
					if (!vars[i]) {
						continue;
					}
					var pair = vars[i].split('=');
					if (pair.length < 2) {
						continue;
					}
					params[pair[0]] = pair[1];
				}
				if (params.gid) {
					params.gid = parseInt(params.gid, 10);
				}
				return params;
			};
			var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL) {
				var pswpElement = document.querySelectorAll('.pswp')[0],
					gallery, options, items;
				items = parseThumbnailElements(galleryElement);
				options = {
					galleryUID: galleryElement.getAttribute('data-pswp-uid'),
					getThumbBoundsFn: function(index) {
						var thumbnail = items[index].el.getElementsByTagName('img')[0] || items[index].el.getElementsByClassName('image')[0],
							pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
							rect = thumbnail.getBoundingClientRect();
						return {
							x: rect.left,
							y: rect.top + pageYScroll,
							w: rect.width
						};
					}
				};
				if (fromURL) {
					if (options.galleryPIDs) {
						for (var j = 0; j < items.length; j++) {
							if (items[j].pid == index) {
								options.index = j;
								break;
							}
						}
					} else {
						options.index = parseInt(index, 10) - 1;
					}
				} else {
					options.index = parseInt(index, 10);
				}
				if (isNaN(options.index)) {
					return;
				}
				if (disableAnimation) {
					options.showAnimationDuration = 0;
				}
				gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
				gallery.init();
			};
			var galleryElements = document.querySelectorAll(gallerySelector);
			for (var i = 0, l = galleryElements.length; i < l; i++) {
				galleryElements[i].setAttribute('data-pswp-uid', i + 1);
				galleryElements[i].onclick = onThumbnailsClick;
			}
			var hashData = photoswipeParseHash();
			if (hashData.pid && hashData.gid) {
				openPhotoSwipe(hashData.pid, galleryElements[hashData.gid - 1], true, true);
			}
		};
		initPhotoSwipeFromDOM('.photoswipe-block');
	};
}, function(module, exports) {
	module.exports = function() {
		$.fn.serializeObject = function() {
			let o = {};
			let a = this.serializeArray();
			$.each(a, function() {
				if (o[this.name] !== undefined) {
					if (!o[this.name].push) {
						o[this.name] = [o[this.name]];
					}
					o[this.name].push(this.value || '');
				} else {
					o[this.name] = this.value || '';
				}
			});
			return o;
		};
		$('.overlay-bg').click(function() {
			$(this).removeClass('is-active');
			$('.sidebar, header, header .mobile-additional').removeClass('is-open is-active');
			$('body').removeClass('modal-open');
		});
		$('form').submit(function(e) {
			e.preventDefault();
		});
		$('.subscribe-form').submit(function(e) {
			e.preventDefault();
			$('#modalSuccess').modal('show');
		})

		function dsThemeOptions() {
			$('.ds-toggle-option').on('click', function() {
				var cOption = $(this).parents('.ds-theme-options');
				if ($('.ds-theme-options').not(cOption).hasClass('in')) {
					$('.ds-theme-options').not(cOption).removeClass('in');
				}
				cOption.toggleClass('in');
			});
			$(document).keyup(function(e) {
				if ($('.ds-theme-options').hasClass('in') && e.keyCode === 27) {
					$('.ds-theme-options').removeClass('in');
				}
			});
			$('.c-option-colorscheme').on('click', 'li', function() {
				var head = $('head');
				var c = $(this).data('scheme');
				$('.c-option-colorscheme li').removeClass('is-active');
				$(this).addClass('is-active');
				$('body').removeClass('theme-color-purple theme-color-dark theme-color-blue theme-color-green theme-color-red');
				$('body').addClass(c);
				if (c === 'theme-color-purple') {
					$('header .logotype .logo img, .footer .footer-nav .logotype .logo img').attr('src', './images/logo-purple.svg').attr('srcset', './images/logo-purple.svg');
					$('.sidebar.style3 .outer .logo').css('background-image', 'url(./images/logo-purple.svg)')
				}
				if (c === 'theme-color-dark') {
					$('header .logotype .logo img, .footer .footer-nav .logotype .logo img').attr('src', './images/logo-dark.svg').attr('srcset', './images/logo-dark.svg');
					$('.sidebar.style3 .outer .logo').css('background-image', 'url(./images/logo-dark.svg)')
				}
				if (c === 'theme-color-blue') {
					$('header .logotype .logo img, .footer .footer-nav .logotype .logo img').attr('src', './images/logo-blue.svg').attr('srcset', './images/logo-blue.svg');
					$('.sidebar.style3 .outer .logo').css('background-image', 'url(./images/logo-blue.svg)')
				}
				if (c === 'theme-color-green') {
					$('header .logotype .logo img, .footer .footer-nav .logotype .logo img').attr('src', './images/logo-green.svg').attr('srcset', './images/logo-green.svg');
					$('.sidebar.style3 .outer .logo').css('background-image', 'url(./images/logo-green.svg)')
				}
				if (c === 'theme-color-red') {
					$('header .logotype .logo img, .footer .footer-nav .logotype .logo img').attr('src', './images/logo-red.svg').attr('srcset', './images/logo-red.svg');
					$('.sidebar.style3 .outer .logo').css('background-image', 'url(./images/logo-red.svg)')
				}
			});
		};
		dsThemeOptions();
	};
}, function(module, exports) {
	module.exports = function() {};
}, function(module, exports) {
	module.exports = function() {
		$('.modal.login form').validator().submit(function(e) {
			if (!e.isDefaultPrevented()) {
				e.preventDefault();
				$('.modal-container').fadeOut(300).children('.modal.login').fadeOut(300);
				let userInfo = JSON.stringify($(this).serializeObject());
				console.log(userInfo);
			}
		});
		$('.modal.registration form').validator().submit(function(e) {
			if (!e.isDefaultPrevented()) {
				e.preventDefault();
				let userInfo = JSON.stringify($(this).serializeObject());
				console.log(userInfo);
				$('.modal.registration .success-message .user-email').text($('#userEmail').val());
				$('.modal.registration form,' + '.modal.registration .socials,' + '.modal.registration .or-line').fadeOut(300);
				$('.modal.registration .success-message').fadeIn(300);
				setTimeout(function() {
					$('.modal-container').fadeOut(300).children('.modal.registration').fadeOut(300);
				}, 3000);
			}
		});
	};
}, function(module, exports, __webpack_require__) {
	const functions = __webpack_require__(8);
	module.exports = function() {
		function modalCall(modalClass) {
			$('.modal-container .modal-bg').fadeIn(300);
			$('.modal-container .modal').fadeOut(300);
			$('.modal-container').fadeIn(300).children('.modal.' + modalClass + '').fadeIn(300);
		}
		$('.modal-container .modal-bg').on('click', function(e) {
			e.preventDefault();
			$(this).fadeOut(300);
			$('.modal-container .modal').fadeOut(300);
		});
		$('.modal .close').on('click', function(e) {
			e.preventDefault();
			$(this).parent('.modal').fadeOut(300);
			$('.modal-bg').fadeOut(300);
		});
		$('.sign-up-btn').on('click', function() {
			modalCall('registration');
		});
		$('.sign-in-btn').on('click', function() {
			modalCall('login');
		});
		$('header #menu').on('click', function(e) {
			e.preventDefault();
			$('.main-wrapper').toggleClass('sidebar-opened');
			setTimeout(function() {
				$('#post-slider-2').trigger('refresh.owl.carousel');
			}, 250);
		});
		$('.sort-bar .dropdown-menu').on('click', 'li a', function() {
			$(this).parent().addClass('active').siblings('li').removeClass('active');
			$(this).closest('.dropdown').find('.dropdown-toggle:first-child').html($(this).text() + '<i class="fa fa-chevron-down" aria-hidden="true"></i>');
			$(this).closest('.dropdown').find('.dropdown-toggle:first-child').val($(this).text());
			functions.updateDate();
		});
		$('.dropdown.change-text .dropdown-menu').on('click', 'li a', function() {
			$(this).closest('.change-text').children('button').text($(this).text()).val($(this).text());
		});
		$('.news-container .news-bar a').click(function() {
			$(".news-content .page-navigation").removeClass('is-fixed');
			setTimeout(function() {
				functions.setFooter();
			}, 100);
		})
		$('footer .footer-nav .toggle-menu, .footer .footer-nav .toggle-menu').click(function() {
			$(this).closest('.footer-nav').toggleClass('is-active');
			if ($(this).closest('.footer-nav').hasClass('is-active')) {
				$(this).find('i.ico').html('-');
			} else {
				$(this).find('i.ico').html('+');
			}
		});
		function initHomepageVideo(el) {
			var video = document.querySelector(el);
			video.play();
			function updateProgressBar() {
				var progressBar = document.querySelector('.main-video .progress-bar .line');
				var percentage = Math.floor((100 / video.duration) * video.currentTime);
				progressBar.style.width = percentage + '%';
			}
			video.addEventListener('timeupdate', updateProgressBar, false);
		}
		if ($("*").is('#video-homepage')) {
			setTimeout(function() {
				initHomepageVideo("#video-homepage")
			}, 300);
		}
		$('.main-wrapper .swipeleft, .main-wrapper .swiperight').swipe({
			swipe: function(event, direction, distance, duration, fingerCount, fingerData) {
				if (direction === 'right') {
					$('.main-wrapper .sidebar').addClass('is-open');
					$('.overlay-bg').addClass('is-active');
					$('body').addClass('modal-open');
				}
			},
			threshold: 0
		});
		$('.main-wrapper').click(function(e) {
			if ($('.main-wrapper .sidebar').hasClass('is-active')) {
				$('.main-wrapper .sidebar').removeClass('is-active');
			}
		});
		$('.scroll-to').click(function() {
			var el = $(this).attr('href');
			$(this).closest('.navigation-menu').find('li').removeClass('active');
			if ($("*").is(el)) {
				$(this).closest('li').addClass('active');
				$('html, body').animate({
					scrollTop: $(el).offset().top - 55
				}, 500);
				return false;
			}
		});
		$('.sidebar.style3 .outer .humburger').click(function() {
			$(this).closest('.style3').toggleClass('is-open');
			$('.overlay-bg').toggleClass('is-active');
			$('body').toggleClass('modal-open');
		});
		$('header .mobile-icons > div').click(function() {
			if ($(this).hasClass('search')) {
				$(this).closest('header').find('.mobile-additional.search').addClass('is-active');
			}
			if ($(this).hasClass('share')) {
				$(this).closest('header').find('.mobile-additional.share').addClass('is-active');
			}
			$('header').addClass('is-open');
			$('.overlay-bg').addClass('is-active');
			$('body').addClass('modal-open');
		});
		$('header .mobile-additional .back').click(function() {
			$(this).closest('.mobile-additional').removeClass('is-active');
			$('body').removeClass('modal-open');
			$('.overlay-bg').removeClass('is-active');
		});
		$('.dropdown.sort .dropdown-menu li a').click(function() {
			var dropdown_sort = $(this).closest('.sort-bar').find('.dropdown.sort');
			$('.sort-bar .sort-item.sort').remove();
			$('<div class="sort-item sort"><span>' + $(this).text() + '</span><i class="remove"></i></div>').insertAfter(dropdown_sort);
		});
		$('.sort-bar').on('click', '.sort-item .remove', function() {
			$(this).closest('.sort-item').remove();
		});
		$('.sidebar .tags a').click(function() {
			var tagText = $(this).text().replace(',', ''),
				tagFlag = 0;
			$('.sort-bar').find('.sort-item.tag').each(function() {
				console.log($(this).find('span').text())
				if (tagText === $(this).find('span').text()) {
					tagFlag++;
				}
			});
			if (tagFlag <= 0) {
				$('.sort-bar').append('<div class="sort-item tag"><span>' + tagText + '</span><i class="remove"></i></div>');
			}
		});
		$('.news-container .news-content .playlist-gallery .post.post-playlist .image').click(function() {
			$('.news-container .news-bar li a').each(function() {
				if ($(this).attr('href') === '#news-video') {
					$(this).click();
				}
			});
		});
		$(document).on('click', '.faq-list-wrapper a', function(e) {
			e.preventDefault();
			$('html, body').animate({
				scrollTop: $($.attr(this, 'href')).offset().top - 70
			}, 500);
		});
		$('.scroll_to').on('click', function(e) {
			e.preventDefault();
			if ($($(this).data('block')).html() !== undefined) {
				$('html, body').animate({
					scrollTop: $($(this).data('block')).offset().top - 80
				}, 500);
			}
		});
	};
}, function(module, exports) {
	module.exports = {
		isHidden: function(el) {
			return (el.offsetParent === null)
		},
		setDateHeight: function() {
			$('.news-gallery').each(function() {
				let id = $(this).data('date');
				let height = $(this).outerHeight();
				$('#' + id).height(height);
			});
		},
		dateFormat: function(date) {
			var day = date.split('.')[0];
			var monthNumber = date.split('.')[1];
			var monthText = '';
			switch (monthNumber) {
			case '01':
				monthText = 'Jan';
				break;
			case '02':
				monthText = 'Feb';
				break;
			case '03':
				monthText = 'Mar';
				break;
			case '04':
				monthText = 'Apr';
				break;
			case '05':
				monthText = 'May';
				break;
			case '06':
				monthText = 'Jun';
				break;
			case '07':
				monthText = 'Jul';
				break;
			case '08':
				monthText = 'Aug';
				break;
			case '09':
				monthText = 'Sep';
				break;
			case '10':
				monthText = 'Oct';
				break;
			case '11':
				monthText = 'Nov';
				break;
			case '12':
				monthText = 'Dec';
				break;
			}
			return [day, monthText]
		},
		appendDate: function(date, postContainet, topPosition) {
			postContainet.find('.date-bar').append('<div class="date" style="top:' + topPosition + '"><div class="day">' + date[0] + '</div><div class="month">' + date[1] + '</div></div>');
			setTimeout(function() {
				postContainet.find('.date-bar .date').addClass('is-active');
			}, 50);
		},
		updateDate: function() {
			const containet = $('#news-stories .news-gallery')
			const dateFormat = function(date) {
				var day = date.split('.')[0];
				var monthNumber = date.split('.')[1];
				var monthText = '';
				switch (monthNumber) {
				case '01':
					monthText = 'Jan';
					break;
				case '02':
					monthText = 'Feb';
					break;
				case '03':
					monthText = 'Mar';
					break;
				case '04':
					monthText = 'Apr';
					break;
				case '05':
					monthText = 'May';
					break;
				case '06':
					monthText = 'Jun';
					break;
				case '07':
					monthText = 'Jul';
					break;
				case '08':
					monthText = 'Aug';
					break;
				case '09':
					monthText = 'Sep';
					break;
				case '10':
					monthText = 'Oct';
					break;
				case '11':
					monthText = 'Nov';
					break;
				case '12':
					monthText = 'Dec';
					break;
				}
				return [day, monthText]
			}
			const appendDate = function(date, postContainet, topPosition) {
				postContainet.find('.date-bar').append('<div class="date" style="top:' + topPosition + '"><div class="day">' + date[0] + '</div><div class="month">' + date[1] + '</div></div>');
				setTimeout(function() {
					postContainet.find('.date-bar .date').addClass('is-active');
				}, 50);
			}
			containet.find('.date-bar .date').removeClass('is-active');
			setTimeout(function() {
				containet.find('.date-bar .date').remove();
			}, 300);
			setTimeout(function() {
				containet.find('.post').each(function(i, item) {
					appendDate(dateFormat($(item).data('publish-date')), containet, $(item).css('top'));
				});
			}, 600);
		},
		updateIsotopeItem: function(type) {
			const container = $('#news-stories .news-gallery'), sortName = $('#news-stories .sort-bar .dropdown.sort .dropdown-menu li.active a').text();
			if (sortName === 'Newest' || sortName === 'Top Ratings') {
				container.find('.post').each(function(i, item) {
					$(item).addClass('is-visible');
				});
			}
			container.isotope('layout');
		},
		setPostHeight: function() {
			$('.news-gallery').isotope({
				layoutMode: 'masonry',
				itemSelector: '.post',
				percentPosition: true
			});
			$('.video-gallery').isotope({
				layoutMode: 'masonry',
				itemSelector: '.post',
				percentPosition: true,
				getSortData: {
					name: '.title'
				}
			});
		},
		setSticky: function(initType, sidebar, wrapper, offset) {
			let footer = $('footer');
			if (initType === 'init') {
				if ($(wrapper).height() > $(sidebar).height()) {
					$(sidebar).sticky({
						context: wrapper,
						offset: offset,
						observeChanges: true,
					});
					console.log('work');
				}
			} else if (initType === 'destroy') {
				$(sidebar).sticky('destroy');
				console.log('destroyed');
			} else if (initType === 'refresh') {
				$(sidebar).sticky('refresh');
			} else {
				console.log('Initialization error! Check "setStickyFunction();"');
			}
		},
		setFooter: function() {
			let footer = $('footer.footer');
			if ($('.main-wrapper').height() > $('.sidebar').height()) {
				footer.css({
					'top': '0',
					'position': 'relative'
				});
				console.log('content has more height than sidebar');
			} else {
				let bottom = $('.sidebar').height() - 4;
				footer.css({
					'top': bottom,
					'position': 'absolute',
					'display': 'none'
				});
				setTimeout(function() {
					footer.css('display', 'block');
				}, 100);
				$('.sidebar').css({
					'margin-top': '0px',
					'height': $('.sidebar').outerHeight()
				});
				console.log('sidebar has more height than content');
			}
		},
		setRatingStars: function() {
			$('.rating-body').each(function() {
				var rating = $(this).data('rating');
				if ($(this).hasClass('number')) {
					$(this).find('strong').text(rating);
				}
				if (rating > 0) {
					$(this).find('.s-1').addClass('sh');
				}
				if (rating > 2) {
					$(this).find('.s-2').addClass('sh');
				}
				if (rating > 4) {
					$(this).find('.s-3').addClass('sh');
				}
				if (rating > 6) {
					$(this).find('.s-4').addClass('sh');
				}
				if (rating > 8) {
					$(this).find('.s-5').addClass('sh');
				}
			});
		},
		setGalleryThumbs: function() {
			$('.images-gallery .main').each(function() {
				var self = $(this);
				if ($(this).find('.owl-thumbs-body').html() === undefined) {
					$(this).find('.owl-thumbs').wrap("<div class='owl-thumbs-body'><div class='owl-thumbs-list'></div></div>");
					$(this).find('.owl-thumbs').css('transform', 'translateX(0)');
					$(this).find('.owl-thumbs-body').append('<button class="prev is-active"></button>');
					$(this).find('.owl-thumbs-body').append('<button class="next is-active"></button>');
				}
				var prevSlideIndex = 0,
					thumbsWidth = 0,
					countVisibleItems = Math.ceil(self.find('.owl-thumbs-body .owl-thumbs-list').width() / (self.find('.owl-thumbs-body .owl-thumbs-list .owl-thumb-item').outerWidth() + 4));
				self.find('.owl-thumbs-body .owl-thumbs .owl-thumb-item').each(function() {
					thumbsWidth += $(this).outerWidth() + 4;
				});
				self.find('.owl-thumbs-body .owl-thumbs').width(thumbsWidth);
				self.on('changed.owl.carousel', function(event) {
					var thumbs = self.find('.owl-thumbs-body .owl-thumbs'),
						widthOne = 0,
						nowSlide = Number(thumbs.css('transform').split(',')[4]),
						currentIndex = $(this).find('.owl-thumb-item.active').index() + 1,
						count = event.item.count;
					if (countVisibleItems <= 4 && self.find('.owl-thumbs-body .owl-thumbs-list .owl-thumb-item').outerWidth() + 4 === 49) {
						widthOne = 49
					} else {
						widthOne = 69;
					}
					if (currentIndex === 1 || currentIndex === 2) {
						thumbs.css('transform', 'translateX(0px)');
					}
					if (currentIndex === count) {
						thumbs.css('transform', 'translateX(-' + (widthOne * (count - countVisibleItems)) + 'px)');
					}
					if (currentIndex >= countVisibleItems && currentIndex < count) {
						if (prevSlideIndex > currentIndex) {
							thumbs.css('transform', 'translateX(' + (nowSlide + widthOne) + 'px)');
						} else {
							thumbs.css('transform', 'translateX(' + (nowSlide - widthOne) + 'px)');
						}
					}
					prevSlideIndex = currentIndex;
				});
				self.find('.owl-thumbs-body .prev').click(function() {
					self.trigger('prev.owl.carousel');
				});
				self.find('.owl-thumbs-body .next').click(function() {
					self.trigger('next.owl.carousel');
				});
				if ($(this).find('.owl-stage-outer').css('height') === '1px') {
					setTimeout(function() {
						let imgHeight = self.find('.owl-stage-outer .owl-item.active img').height();
						self.find('.owl-stage-outer').css('height', imgHeight + 'px');
					}, 800);
				}
			});
		}
	};
}, function(module, exports) {
	module.exports = function() {
		var lastScrollTop = 0;
		$(window).scroll(function() {
			var self = $(this);
			(function() {
				var s_top = window.pageYOffset || document.documentElement.scrollTop,
					el = $(".news-content #about-author, .blog-post-page .blog-post");
				if ($("*").is(el)) {
					if (s_top > el.offset().top - 70) {
						$(".news-content .page-navigation, .blog-post-page .blog-post .page-navigation").addClass('is-fixed');
					} else {
						$(".news-content .page-navigation, .blog-post-page .blog-post .page-navigation").removeClass('is-fixed');
					}
				}
			})();
			(function() {
				var s_top = window.pageYOffset || document.documentElement.scrollTop,
					el = $('.faq-main-block .faq-list-wrapper');
				if ($("*").is(el)) {
					if (s_top > 50) {
						el.addClass('is-fixed');
					} else {
						el.removeClass('is-fixed');
					}
				}
			})();
			if (window.outerWidth > 991) {
				fixedSidebar(document.querySelector('.sidebar.style1'));
			}
			hideHeader('header');
		});
		var lastScrollTopHeader = 0;
		function hideHeader(header) {
			var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
			if (scrollTop > lastScrollTopHeader) {
				if (scrollTop >= 150) {
					$(header).addClass('hide-top');
				}
			} else {
				$(header).removeClass('hide-top');
			}
			lastScrollTopHeader = scrollTop;
		}

		function fixedSidebar(sidebar) {
			var html = $('html');
			var html_margin = null;
			if (sidebar !== null && sidebar !== undefined) {
				if (html.css('margin-top') !== null) {
					html_margin = parseInt(html.css('margin-top'));
				}
				var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				window.position = {
					top: scrollTop,
					bottom: window.pageYOffset + document.documentElement.clientHeight
				};
				sidebar.position = {
					top: window.pageYOffset + sidebar.getBoundingClientRect().top,
					bottom: window.pageYOffset + sidebar.getBoundingClientRect().bottom
				};
				if (html_margin !== null) {
					sidebar.position.top = sidebar.position.top - html_margin;
				}
				if (scrollTop <= 1) {
					if (html_margin !== null) {
						$(sidebar).css('margin-top', html_margin + 'px');
					} else {
						$(sidebar).css('margin-top', '0px');
					}
				}
				if (scrollTop > lastScrollTop) {
					$(sidebar).removeClass('is-fixed-top');
					$(sidebar).css('margin-top', sidebar.position.top);
					if (window.position.bottom >= sidebar.position.bottom) {
						$(sidebar).addClass('is-fixed-bottom');
					}
				} else {
					$(sidebar).removeClass('is-fixed-bottom');
					$(sidebar).css('margin-top', sidebar.position.top);
					if (window.position.top <= sidebar.position.top) {
						$(sidebar).addClass('is-fixed-top');
						if (html_margin !== null) {
							$(sidebar).css('margin-top', html_margin + 'px');
						} else {
							$(sidebar).css('margin-top', '0px');
						}
					}
				}
				lastScrollTop = scrollTop;
			}
		}
	}
}, function(module, exports, __webpack_require__) {
	const functions = __webpack_require__(8);
	module.exports = function() {
		this.postSliderMultipost = $('#post-slider-multipost').owlCarousel({
			loop: true,
			items: 1,
			dots: true,
			margin: 10,
			nav: true,
			navText: ["<img src='./images/icons/arrow-left-white.svg' alt='arrow'>", "<img src='./images/icons/arrow-right-white.svg' alt='arrow'>"],
			responsive: {
				540: {
					items: 3,
					margin: 10,
				},
				767: {
					items: 5,
					margin: 15,
				}
			}
		});
		this.postSlider = $('#post-slider-image').owlCarousel({
			loop: false,
			items: 1,
			dots: true,
			nav: true,
			navText: ["<img src='./images/icons/arrow-left.svg' alt='arrow'>", "<img src='./images/icons/arrow-right.svg' alt='arrow'>"]
		});
		this.postSlider = $('#post-slider-2').owlCarousel({
			loop: true,
			items: 1,
			dots: true,
			nav: true,
			navText: ["<img src='./images/icons/arrow-left.svg' alt='arrow'>", "<img src='./images/icons/arrow-right.svg' alt='arrow'>"]
		});
		this.blogpostSlider = $('.blogpost-slider').owlCarousel({
			loop: true,
			items: 1,
			dots: false,
			nav: true,
			navText: ["<img src='./images/icons/arrow-left.svg' alt='arrow'>", "<img src='./images/icons/arrow-right.svg' alt='arrow'>"],
			thumbs: true,
			thumbsPrerendered: true
		});
		this.postSliders = (function() {
			$('.post-gallery.post--width2 .post-images-slider .main').owlCarousel({
				loop: true,
				items: 2,
				dots: false,
				nav: true,
				thumbs: false,
				autoHeight: true,
				margin: 4,
				responsive: {
					1599: {
						items: 3
					}
				}
			});
			$('.post-gallery .post-images-slider .main').owlCarousel({
				loop: true,
				items: 2,
				dots: false,
				nav: true,
				thumbs: false,
				autoHeight: true,
				margin: 4
			});
			$('.images-slider .main').owlCarousel({
				loop: true,
				items: 1,
				dots: false,
				nav: true,
				thumbs: false,
				autoHeight: true,
				margin: 2,
			});
			$('.images-gallery .main').owlCarousel({
				loop: true,
				items: 1,
				dots: false,
				nav: false,
				thumbs: true,
				thumbImage: true,
				autoHeight: true,
				margin: 2
			});
		})();
	};
}, function(module, exports, __webpack_require__) {
	const functions = __webpack_require__(8);
	module.exports = function() {
		this.$news = $('.news-gallery').isotope({
			layoutMode: 'packery',
			itemSelector: '.post',
			percentPosition: true,
			getSortData: {
				rating: '[data-rating]',
				date: '[data-publish-date]',
			}
		});
		this.$video = $('.video-gallery').isotope({
			layoutMode: 'packery',
			itemSelector: '.post',
			percentPosition: true,
			getSortData: {
				rating: '[data-rating]',
				date: '[data-publish-date]',
			}
		});
		$news.imagesLoaded(function(e) {
			var postList = $(e.elements[0]).find('.post');
			postList.each(function(i, item) {
				functions.appendDate(functions.dateFormat($(item).data('publish-date')), $news, $(item).css('top'));
			});
		});
		$('.news-bar li a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
			$news.isotope('layout');
			$video.isotope('layout');
			functions.setPostHeight();
			functions.setDateHeight();
			setTimeout(function() {
				new WOW().init();
			}, 500);
		});
		setInterval(function() {
			$news.isotope('layout');
			$video.isotope('layout');
		}, 2000);
	};
}, function(module, exports, __webpack_require__) {
	const isotope = __webpack_require__(11);
	const functions = __webpack_require__(8);
	const sliders = __webpack_require__(10);
	module.exports = function() {
		var ajaxCount = 2;
		var flagLoading = false;
		$('.load-data').appear();
		$('.load-data').on('appear', function(e, el) {
			function appendItems(data) {
				let bodyEl = $(el).closest('.load-post-body');
				let day = ajaxCount;
				let month = 'Sep'
				let newItems = $('<div class="content news-gallery opacity-0"><div class="date-bar"><div class="date"><div class="day">' + day + '</div><div class="month">' + month + '</div></div></div>' + data + '</div>');
				let news = bodyEl.find('.content.news-gallery');
				let lastPostItem = news.eq(0).find('.post').length;
				news.imagesLoaded(function(e) {
					news.isotope('updateSortData', $(data)).isotope('insert', $(data));
					setTimeout(function() {
						var postList = $(e.elements[0]).find('.post');
						let slider = new sliders();
						slider.blogpostSlider;
						slider.postSliders;
						functions.setRatingStars();
						postList.each(function(i, item) {
							functions.appendDate(functions.dateFormat($(item).data('publish-date')), news, $(item).css('top'));
						});
						functions.setGalleryThumbs();
						functions.updateIsotopeItem();
					}, 500);
				})
			}
			if (!flagLoading) {
				flagLoading = true;
				//if (ajaxCount <= 1) {
					$(el).addClass('is-active');
					$.post('command.php', {cpage: ajaxCount}, function(data) {
						setTimeout(function() {
							appendItems(data);
							$(el).removeClass('is-active');
							flagLoading = false;
                            if(data.trim()>"") ajaxCount++;
						}, 700);
					});
				//}
			}
		});
	};
}, function(module, exports) {
	module.exports = function() {
		$('body').on('click', '.news-content .post .video .video-play, #post-slider-multipost .item .video .video-play, .blog-post-page .blog-post .content .image.video .video-play', function(e) {
			e.preventDefault();
			let video = $(this).closest('.video').find('video').get(0);
			$(this).removeClass('is-ended');
			if (video.paused) {
				video.play();
				$(this).addClass('is-playing');
			} else {
				video.pause();
				$(this).removeClass('is-playing');
			}
		});
		$('body').on('click', '.news-content .post .video .video-sound, #post-slider-multipost .item .video .video-sound, .blog-post-page .blog-post .content .image.video .video-sound', function(e) {
			e.preventDefault();
			let video = $(this).closest('.video').find('video').get(0);
			if ($(this).hasClass('off')) {
				video.muted = false;
				$(this).removeClass('off').addClass('on');
			} else {
				video.muted = true;
				$(this).removeClass('on').addClass('off');
			}
		});
		$('.news-content .post .video video, #post-slider-multipost .item .video video, .blog-post-page .blog-post .content .image.video video').each(function() {
			let self = $(this).get(0);
			self.muted = true;
			self.addEventListener('ended', function() {
				$(this).closest('.video').find('.video-play').removeClass('is-playing').addClass('is-ended');
			});
		})
	};
}, function(module, exports) {
	module.exports = function() {
		let now = new Date(), startRangeDate = monthText(now.getMonth(), now.getDate()), endRangeDate = monthText(now.getMonth(), now.getDate());
		function monthText(m, d) {
			let month = '', day = '';
			switch (m) {
			case 0:
				month = 'Jan';
				break;
			case 1:
				month = 'Feb';
				break;
			case 2:
				month = 'Mar';
				break;
			case 3:
				month = 'Apr';
				break;
			case 4:
				month = 'May';
				break;
			case 5:
				month = 'Jun';
				break;
			case 6:
				month = 'Jul';
				break;
			case 7:
				month = 'Aug';
				break;
			case 8:
				month = 'Sep';
				break;
			case 9:
				month = 'Oct';
				break;
			case 10:
				month = 'Nov';
				break;
			case 11:
				month = 'Des';
				break;
			}
			switch (d) {
			case 1:
				day = '1st';
				break;
			case 2:
				day = '2nd';
				break;
			case 3:
				day = '3rd';
				break;
			case 4:
				day = '4th';
				break;
			case 5:
				day = '5th';
				break;
			case 6:
				day = '6th';
				break;
			case 7:
				day = '7th';
				break;
			case 8:
				day = '8th';
				break;
			case 9:
				day = '9th';
				break;
			case 10:
				day = '10th';
				break;
			case 11:
				day = '11th';
				break;
			case 12:
				day = '12th';
				break;
			case 13:
				day = '13th';
				break;
			case 14:
				day = '14th';
				break;
			case 15:
				day = '15th';
				break;
			}
			return month + ' ' + day;
		}

		function appendElem() {
			let hideHtml = '<div class="calentim-hide"><a href="javascript:void(0)"><i class="fa fa-close" aria-hidden="true"></i></a></div>', saveHtml = '<div class="calentim-hide save"><span>Save</span></div>';
			$('.calentim-container .calentim-input .calentim-header').append(hideHtml);
			$('.calentim-container .calentim-calendar').append(saveHtml);
		}
		$('#datepicker-main').calentim({
			singleDate: false,
			showFooter: false,
			showTimePickers: false,
			format: "MMM Do",
			startOnMonday: true,
			showOn: "top",
			dateSeparator: ' - ',
			enableMonthSwitcher: true,
			enableYearSwitcher: false,
			oneCalendarWidth: 380,
			calendarCount: 1,
			onbeforeshow: function(calentim) {
				appendElem();
			},
			onaftermonthchange: function(calentim) {
				appendElem();
			}
		});
		$(document).on("click", ".calentim-hide", function(e) {
			let calentimMain = $("#datepicker-main").data("calentim");
			calentimMain.hideDropdown(e);
		});
	};
}]);

function autocomplete(inp) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus, arr;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
      var a, b, i, val = this.value, $ = jQuery;
      /*close any already open lists of autocompleted values*/ 
      //if(val.length > 1){   
          $.ajax({
                type: "POST",
                async: false,
                url: "command.php",
                data: "cSearch="+val,
                success: function(data){
                    arr = JSON.parse(data);	
                }
          });
          
          closeAllLists();
          if (!val) { return false;}
          currentFocus = -1;
          /*create a DIV element that will contain the items (values):*/
          a = document.createElement("DIV");
          a.setAttribute("id", this.id + "autocomplete-list");
          a.setAttribute("class", "autocomplete-items");
          /*append the DIV element as a child of the autocomplete container:*/
          this.parentNode.appendChild(a);
          /*for each item in the array...*/
          for (i = 0; i < arr.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            //if (arr[i].name.substr(0, val.length).toUpperCase() == val.toUpperCase()) {
              /*create a DIV element for each matching element:*/
              b = document.createElement("DIV");
              /*make the matching letters bold:*/
              var str = arr[i].name;
              var fnd = str.match(new RegExp(val, 'ig'));
              
              fnd.forEach(function(elt) {
                str = str.replace(new RegExp(elt, 'g'), '<b>' + elt + '</b>')
              });
              
              b.innerHTML = "<table><tr><td><img style='height: 50px; width: auto;' src='files/"+arr[i].image+"'/></td><td style='padding-left: 5px;'>"+str+"</td></tr></table>"; //.replace(new RegExp(val, 'ig'), '<b>' + val + '</b>');
              //b.innerHTML = "<b>" + arr[i].name.substr(0, val.length) + "</b>";
              //b.innerHTML += arr[i].name.substr(val.length);
              /*insert a input field that will hold the current array item's value:*/
              b.innerHTML += "<input id='name' type='hidden' value='" + JSON.stringify(arr[i]) + "'>";
              //b.innerHTML += "<input id='id' type='hidden' value='" + arr[i].id + "'>";
              /*execute a function when someone clicks on the item value (DIV element):*/
              b.addEventListener("click", function(e) {
                  /*insert the value for the autocomplete text field:*/
                  //inp.value = this.getElementsByTagName("input")[0].value;
                  
                  sarr = JSON.parse(this.getElementsByTagName("input")[0].value);
                  if(sarr.type == "1"){
                        self.location = "player.php?play="+sarr.id;
                  } else {
                        self.location = "download.php?load="+sarr.id;
                  }
                  /*close the list of autocompleted values,
                  (or any other open lists of autocompleted values:*/
                  closeAllLists();
              });
              a.appendChild(b);
            //}
          }
      //}
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        this.submit();
        /*If the ENTER key is pressed, prevent the form from being submitted,
        e.preventDefault();
        if (currentFocus > -1) {
          //and simulate a click on the "active" item:
          if (x) x[currentFocus].click();
        }*/
      }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}
var $idown;
function filedownload(url) {
    var $ = jQuery;
    if ($idown) {
        $idown.attr('src',url);
    } else {
        $idown = $('<iframe>', { id:'idown', src:url }).hide().appendTo('body');
    }
}