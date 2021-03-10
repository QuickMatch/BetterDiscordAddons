/**
 * @name CompleteTimestamps
 * @author DevilBro
 * @authorId 278543574059057154
 * @version 1.5.4
 * @description Replaces Timestamps with your own custom Timestamps
 * @invite Jx3TjNS
 * @donate https://www.paypal.me/MircoWittrien
 * @patreon https://www.patreon.com/MircoWittrien
 * @website https://mwittrien.github.io/
 * @source https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/CompleteTimestamps/
 * @updateUrl https://mwittrien.github.io/BetterDiscordAddons/Plugins/CompleteTimestamps/CompleteTimestamps.plugin.js
 */

module.exports = (_ => {
	const config = {
		"info": {
			"name": "CompleteTimestamps",
			"author": "DevilBro",
			"version": "1.5.4",
			"description": "Replaces Timestamps with your own custom Timestamps"
		},
		"changeLog": {
			"added": {
				"Audit Logs": "Logs are now also affected by the plugin"
			},
			"fixed": {
				"Embeds": "Fixed Issue where timestamps of some embeds weren't affected"
			}
		}
	};

	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		getName () {return config.info.name;}
		getAuthor () {return config.info.author;}
		getVersion () {return config.info.version;}
		getDescription () {return `The Library Plugin needed for ${config.info.name} is missing. Open the Plugin Settings to download it. \n\n${config.info.description}`;}
		
		downloadLibrary () {
			require("request").get("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js", (e, r, b) => {
				if (!e && b && r.statusCode == 200) require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => BdApi.showToast("Finished downloading BDFDB Library", {type: "success"}));
				else BdApi.alert("Error", "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library");
			});
		}
		
		load () {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.showConfirmationModal("Library Missing", `The Library Plugin needed for ${config.info.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						this.downloadLibrary();
					}
				});
			}
			if (!window.BDFDB_Global.pluginQueue.includes(config.info.name)) window.BDFDB_Global.pluginQueue.push(config.info.name);
		}
		start () {this.load();}
		stop () {}
		getSettingsPanel () {
			let template = document.createElement("template");
			template.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${config.info.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
			template.content.firstElementChild.querySelector("a").addEventListener("click", this.downloadLibrary);
			return template.content.firstElementChild;
		}
	} : (([Plugin, BDFDB]) => {
		var languages, currentMode;
		var settings = {}, choices = {}, formats = {}, amounts = {};
	
		return class CompleteTimestamps extends Plugin {
			onLoad () {
				this.defaults = {
					settings: {
						showInChat:				{value: true, 			description: "Replace Chat Timestamps with complete Timestamps"},
						showInEmbed:			{value: true, 			description: "Replace Embed Timestamps with complete Timestamps"},
						showInAuditLogs:		{value: true, 			description: "Replace Audit Log Timestamps with complete Timestamps"},
						changeForChat:			{value: true, 			description: "Change the Time for Chat Time Tooltips"},
						changeForEdit:			{value: true, 			description: "Change the Time for Edited Time Tooltips"},
						displayTime:			{value: true, 			description: "Display the Time in Timestamps"},
						displayDate:			{value: true, 			description: "Display the Date in Timestamps"},
						cutSeconds:				{value: false, 			description: "Cut off Seconds of the Time"},
						forceZeros:				{value: false, 			description: "Force leading Zeros"},
						otherOrder:				{value: false, 			description: "Show the Time before the Date"},
						useDateInDaysAgo:		{value: false, 			description: "Use the Date instead of 'x days ago' in $daysago Placeholder"}
					},
					choices: {
						timestampLang:			{value: "$discord", 	description: "Chat Timestamp Format"},
						timestampToolLang:		{value: "$discord", 	description: "Tooltip Timestamp Format"}
					},
					formats: {
						ownFormat:				{value: "$hour:$minute:$second, $day.$month.$year", 	description: "Own Chat Format"},
						ownFormatTool:			{value: "$hour:$minute:$second, $day.$month.$year", 	description: "Own Tooltip Format"}
					},
					amounts: {
						maxDaysAgo:				{value: 0, 	min: 0,		description: "Maximum Count of Days displayed in the $daysago Placeholder",	note: "0 equals no Limit"}
					}
				};
				
				this.patchedModules = {
					after: {
						Message: "default",
						MessageHeader: "default",
						MessageContent: "type",
						Embed: "render",
						SystemMessage: "default",
						AuditLog: "render"
					}
				};
				
				this.css = `
					${BDFDB.dotCN.messagetimestamp} {
						z-index: 1;
					}
				`;
			}
			
			onStart () {
				languages = BDFDB.ObjectUtils.deepAssign({
					own: {
						name: "Own",
						id: "own"
					}
				}, BDFDB.LanguageUtils.languages);
				
				this.forceUpdateAll();
			}
			
			onStop () {
				this.forceUpdateAll();
				
				BDFDB.DOMUtils.removeLocalStyle(this.name + "CompactCorrection");
			}

			getSettingsPanel (collapseStates = {}) {
				let settingsPanel, settingsItems = [];
				
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
					title: "Settings",
					collapseStates: collapseStates,
					children: Object.keys(settings).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "Switch",
						plugin: this,
						keys: ["settings", key],
						label: this.defaults.settings[key].description,
						value: settings[key],
						onChange: (value, instance) => {
							settings[key] = value;
							BDFDB.ReactUtils.forceUpdate(BDFDB.ReactUtils.findOwner(BDFDB.ReactUtils.findOwner(instance, {name: "BDFDB_SettingsPanel", up: true}), {name: "BDFDB_Select", all: true, noCopies: true}));
						}
					}))
				}));
				
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
					title: "Format",
					collapseStates: collapseStates,
					children: Object.keys(choices).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "Select",
						plugin: this,
						keys: ["choices", key],
						label: this.defaults.choices[key].description,
						basis: "65%",
						value: choices[key],
						options: BDFDB.ObjectUtils.toArray(BDFDB.ObjectUtils.map(languages, (lang, id) => ({value: id, label: lang.name}))),
						searchable: true,
						optionRenderer: lang => {
							return BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
								align: BDFDB.LibraryComponents.Flex.Align.CENTER,
								children: [
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 0,
										basis: "40%",
										children: lang.label
									}),
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 0,
										basis: "60%",
										children: this.getTimestamp(languages[lang.value].id, null, key == "timestampToolLang")
									})
								]
							});
						},
						valueRenderer: lang => {
							return BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
								align: BDFDB.LibraryComponents.Flex.Align.CENTER,
								children: [
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 0,
										children: lang.label
									}),
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 1,
										shrink: 0,
										basis: "70%",
										children: this.getTimestamp(languages[lang.value].id, null, key == "timestampToolLang")
									})
								]
							});
						}
					})).concat(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormDivider, {
						className: BDFDB.disCN.marginbottom8
					})).concat(Object.keys(formats).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "TextInput",
						plugin: this,
						keys: ["formats", key],
						label: this.defaults.formats[key].description,
						basis: "65%",
						value: formats[key],
						onChange: (value, instance) => {
							formats[key] = value;
							BDFDB.ReactUtils.forceUpdate(BDFDB.ReactUtils.findOwner(BDFDB.ReactUtils.findOwner(instance, {name: "BDFDB_SettingsPanel", up: true}), {name: "BDFDB_Select", all: true, noCopies: true}));
						}
					}))).concat(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormDivider, {
						className: BDFDB.disCN.marginbottom8
					})).concat(Object.keys(amounts).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
						type: "TextInput",
						childProps: {
							type: "number"
						},
						plugin: this,
						keys: ["amounts", key],
						label: this.defaults.amounts[key].description,
						note: this.defaults.amounts[key].note,
						basis: "20%",
						min: this.defaults.amounts[key].min,
						max: this.defaults.amounts[key].max,
						value: amounts[key]
					})))
				}));
				
				settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
					title: "Placeholder Guide",
					collapseStates: collapseStates,
					children: [
						"$hour will be replaced with the hour of the date",
						"$minute will be replaced with the minutes of the date",
						"$second will be replaced with the seconds of the date",
						"$msecond will be replaced with the milliseconds of the date",
						"$timemode will change $hour to a 12h format and will be replaced with AM/PM",
						"$year will be replaced with the year of the date",
						"$yearS will be replaced with the year in short form",
						"$month will be replaced with the month of the date",
						"$day will be replaced with the day of the date",
						"$monthnameL will be replaced with the monthname in long format based on the Discord Language",
						"$monthnameS will be replaced with the monthname in short format based on the Discord Language",
						"$weekdayL will be replaced with the weekday in long format based on the Discord Language",
						"$weekdayS will be replaced with the weekday in short format based on the Discord Language",
						"$daysago will be replaced with a string to tell you how many days ago the event occured. For Example: " + BDFDB.LanguageUtils.LanguageStringsFormat("ACTIVITY_FEED_USER_PLAYED_DAYS_AGO", 3)
					].map(string => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormComponents.FormText, {
						type: BDFDB.LibraryComponents.FormComponents.FormTextTypes.DESCRIPTION,
						children: string
					}))
				}));
				
				return settingsPanel = BDFDB.PluginUtils.createSettingsPanel(this, settingsItems);
			}

			onSettingsClosed () {
				if (this.SettingsUpdated) {
					delete this.SettingsUpdated;
					this.forceUpdateAll();
				}
			}
		
			forceUpdateAll () {
				currentMode = null;
					
				settings = BDFDB.DataUtils.get(this, "settings");
				choices = BDFDB.DataUtils.get(this, "choices");
				formats = BDFDB.DataUtils.get(this, "formats");
				amounts = BDFDB.DataUtils.get(this, "amounts");
				
				BDFDB.PatchUtils.forceAllUpdates(this);
				BDFDB.MessageUtils.rerenderAll();
			}

			processMessage (e) {
				if (settings.changeForChat && BDFDB.ObjectUtils.get(e, "instance.props.childrenHeader.type.type.displayName") == "MessageTimestamp") {
					let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: e.instance.props.childrenHeader.type});
					if (index > -1) this.changeTimestamp(children, index, {child: false, tooltip: true});
				}
			}
			
			processMessageHeader (e) {
				let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: "MessageTimestamp"});
				if (index > -1) {
					this.changeTimestamp(children, index, {child: settings.showInChat, tooltip: settings.changeForChat});
					this.setMaxWidth(children[index], e.instance.props.compact);
				}
			}
			
			processMessageContent (e) {
				if (e.instance.props.message.editedTimestamp && settings.changeForEdit) {
					let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: "SuffixEdited"});
					if (index > -1) this.changeTimestamp(children, index, {child: false, tooltip: true});
				}
			}

			processEmbed (e) {
				if (e.instance.props.embed && e.instance.props.embed.timestamp && settings.showInEmbed) {
					let process = returnvalue => {
						let [children, index] = BDFDB.ReactUtils.findParent(returnvalue, {props: [["className", BDFDB.disCN.embedfootertext]]});
						if (index > -1) {
							if (BDFDB.ArrayUtils.is(children[index].props.children)) children[index].props.children[children[index].props.children.length - 1] = this.getTimestamp(languages[choices.timestampLang].id, e.instance.props.embed.timestamp._i);
							else children[index].props.children = this.getTimestamp(languages[choices.timestampLang].id, e.instance.props.embed.timestamp._i);
						}
					};
					if (typeof e.returnvalue.props.children == "function") {
						let childrenRender = e.returnvalue.props.children;
						e.returnvalue.props.children = (...args) => {
							let children = childrenRender(...args);
							process(children);
							return children;
						};
					}
					else process(e.returnvalue);
				}
			}

			processSystemMessage (e) {
				if (e.instance.props.timestamp && settings.showInChat) {
					let [children, index] = BDFDB.ReactUtils.findParent(e.returnvalue, {name: "time"});
					if (index > -1) children[index].props.children = this.getTimestamp(languages[choices.timestampLang].id, e.instance.props.timestamp._i);
				}
			}

			processAuditLog (e) {
				if (e.instance.props.log && settings.showInAuditLogs) {
					if (typeof e.returnvalue.props.children == "function") {
						let childrenRender = e.returnvalue.props.children;
						e.returnvalue.props.children = (...args) => {
							let children = childrenRender(...args);
							this.editLog(e.instance.props.log, children);
							return children;
						};
					}
					else this.editLog(e.instance.props.log, e.returnvalue);
				}
			}
			
			editLog (log, returnvalue) {
				if (!log || !returnvalue) return;
				let [children, index] = BDFDB.ReactUtils.findParent(returnvalue, {props: [["className", "timestamp-1mruiI"]]});
				if (index > -1) children[index].props.children = this.getTimestamp(languages[choices.timestampLang].id, log.timestampStart._i);
			}
			
			changeTimestamp (parent, index, change = {}) {
				let type = parent[index].type && parent[index].type.type || parent[index].type;
				if (typeof type != "function") return;
				let stamp = type(parent[index].props), tooltipWrapper;
				if (stamp.type.displayName == "Tooltip") tooltipWrapper = stamp;
				else {
					let [children, tooltipIndex] = BDFDB.ReactUtils.findParent(stamp, {name: "Tooltip"});
					if (tooltipIndex > -1) tooltipWrapper = children[tooltipIndex];
				}
				if (tooltipWrapper) {
					let timestamp = this.getTimestamp(languages[choices.timestampLang].id, parent[index].props.timestamp._i);
					if (change.tooltip) {
						tooltipWrapper.props.text = this.getTimestamp(languages[choices.timestampToolLang].id, parent[index].props.timestamp._i, true);
						tooltipWrapper.props.delay = 0;
					}
					if (change.child && typeof tooltipWrapper.props.children == "function") {
						if (choices.timestampLang == choices.timestampToolLang && formats.ownFormat == formats.ownFormatTool) tooltipWrapper.props.delay = 99999999999999999999;
						let renderChildren = tooltipWrapper.props.children;
						tooltipWrapper.props.children = (...args) => {
							let renderedChildren = renderChildren(...args);
							if (BDFDB.ArrayUtils.is(renderedChildren.props.children)) renderedChildren.props.children[1] = timestamp;
							else renderChildren.props.children = timestamp;
							return renderedChildren;
						};
					}
				}
				parent[index] = stamp;
			}

			getTimestamp (languageId, time, isTooltip) {
				return BDFDB.TimeUtils.suppress(_ => {
					return BDFDB.StringUtils.formatTime(time, Object.assign({
						language: languageId,
						formatString: languageId != "own" && (formats[isTooltip ? "ownFormatTool" : "ownFormat"])
					}, settings, amounts));
				}, "Failed to create Timestamp!", config.info)() || "Failed Timestamp";
			}
			
			setMaxWidth (timestamp, compact) {
				if (currentMode != compact) {
					currentMode = compact;
					if (timestamp.props.className && typeof timestamp.type == "string") {
						let tempTimestamp = BDFDB.DOMUtils.create(`<div class="${BDFDB.disCN.messagecompact}"><${timestamp.type} class="${timestamp.props.className}" style="width: auto !important;">${this.getTimestamp(languages[choices.timestampLang].id, new Date(253402124399995))}</${timestamp.type}></div>`);
						document.body.appendChild(tempTimestamp);
						let width = BDFDB.DOMUtils.getRects(tempTimestamp.firstElementChild).width + 10;
						tempTimestamp.remove();
						BDFDB.DOMUtils.appendLocalStyle(this.name + "CompactCorrection", `
							${BDFDB.dotCN.messagecompact + BDFDB.dotCN.messagewrapper} {
								padding-left: ${44 + width}px;
							}
							${BDFDB.dotCNS.messagecompact + BDFDB.dotCN.messagecontents} {
								margin-left: -${44 + width}px;
								padding-left: ${44 + width}px;
								text-indent: calc(-${44 + width}px - -1rem);
							}
							${BDFDB.dotCNS.messagecompact + BDFDB.dotCN.messagetimestamp} {
								width: ${width}px;
							}
						`);
					}
					 
				}
			}
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin(config));
})();
