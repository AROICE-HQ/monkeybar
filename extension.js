import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { fetchTypingActivity, getDates } from './helpers/monkeytypeService.js';
import { ExtensionSettings } from './helpers/settings.js';

// Visual constants for the test boxes in the top bar
const BOX_SIZE = 14;        // Size of each test box in pixels
const BOX_MARGIN = 4;       // Space between each box
const BORDER_RADIUS = 3;    // Rounded corners for the boxes
const COLORS = {
    ACTIVE: '#e2b714',      // Monkeytype yellow color for days with tests
    INACTIVE: '#8e8e8e',    // Gray color for days without tests
    DEFAULT: '#888888'      // Default fallback color
};

// All available color themes - these match what users see in settings
const THEME_NAMES = {
    standard: "Monkeytype",        // Classic Monkeytype yellow theme
    githubDark: "GitHub Green",    // GitHub green gradient theme
    halloween: "Halloween",        // Orange and dark spooky colors
    teal: "Teal",                 // Calming teal/aqua colors
    leftPad: "@left_pad",         // Grayscale theme
    dracula: "Dracula",           // Popular dark theme with purple/pink accents
    blue: "Blue",                 // Cool blue gradient theme
    panda: "Panda 🐼",            // Black and white with colorful accents
    sunny: "Sunny",               // Bright yellow/gold theme
    pink: "Pink",                 // Pink/magenta gradient theme
    solarizedDark: 'Solarized Dark',   // Popular developer theme (dark)
    solarizedLight: 'Solarized Light'  // Popular developer theme (light)
};

const THEMES = {
    standard: {
        text: "#000000",
        meta: "#666666",
        grade4: "#e2b714",
        grade3: "#f0c730",
        grade2: "#f5d65b",
        grade1: "#fae588",
        grade0: "#ebedf0"
    },
    githubDark: {
        text: "#ffffff",
        meta: "#dddddd",
        grade4: "#27d545",
        grade3: "#10983d",
        grade2: "#00602d",
        grade1: "#003820",
        grade0: "#161b22"
    },
    halloween: {
        text: "#000000",
        meta: "#666666",
        grade4: "#03001C",
        grade3: "#FE9600",
        grade2: "#FFC501",
        grade1: "#FFEE4A",
        grade0: "#ebedf0"
    },
    teal: {
        text: "#000000",
        meta: "#666666",
        grade4: "#458B74",
        grade3: "#66CDAA",
        grade2: "#76EEC6",
        grade1: "#7FFFD4",
        grade0: "#ebedf0"
    },
    leftPad: {
        text: "#ffffff",
        meta: "#999999",
        grade4: "#F6F6F6",
        grade3: "#DDDDDD",
        grade2: "#A5A5A5",
        grade1: "#646464",
        grade0: "#2F2F2F"
    },
    dracula: {
        text: "#f8f8f2",
        meta: "#666666",
        grade4: "#ff79c6",
        grade3: "#bd93f9",
        grade2: "#6272a4",
        grade1: "#44475a",
        grade0: "#282a36"
    },
    blue: {
        text: "#C0C0C0",
        meta: "#666666",
        grade4: "#4F83BF",
        grade3: "#416895",
        grade2: "#344E6C",
        grade1: "#263342",
        grade0: "#222222"
    },
    panda: {
        text: "#E6E6E6",
        meta: "#676B79",
        grade4: "#FF4B82",
        grade3: "#19f9d8",
        grade2: "#6FC1FF",
        grade1: "#34353B",
        grade0: "#242526"
    },
    sunny: {
        text: "#000000",
        meta: "#666666",
        grade4: "#a98600",
        grade3: "#dab600",
        grade2: "#e9d700",
        grade1: "#f8ed62",
        grade0: "#fff9ae"
    },
    pink: {
        text: "#000000",
        meta: "#666666",
        grade4: "#61185f",
        grade3: "#a74aa8",
        grade2: "#ca5bcc",
        grade1: "#e48bdc",
        grade0: "#ebedf0"
    },
    solarizedDark: {
        text: "#93a1a1",
        meta: "#586e75",
        grade4: "#d33682",
        grade3: "#b58900",
        grade2: "#2aa198",
        grade1: "#268bd2",
        grade0: "#073642"
    },
    solarizedLight: {
        text: "#586e75",
        meta: "#93a1a1",
        grade4: "#6c71c4",
        grade3: "#dc322f",
        grade2: "#cb4b16",
        grade1: "#b58900",
        grade0: "#eee8d5"
    }
};


// Test count thresholds for grade-based coloring
const TEST_THRESHOLDS = {
    grade1: 1,  // 1-2 tests
    grade2: 3,  // 3-5 tests  
    grade3: 6,  // 6-10 tests
    grade4: 11  // 11+ tests
};

const MESSAGES = {
    NO_DATA: 'No data available',
    NO_TESTS: 'No test data available',
    MISSING_CREDENTIALS: 'Missing Monkeytype username or ApeKey',
    PREFS_ERROR: 'Failed to open extension preferences.'
};

// Display and animation settings
const DATE_FORMAT = { month: 'short' };        // How dates appear in the menu
const DEFAULT_OPACITY = 50;                    // Base opacity for boxes with no tests
const MAX_OPACITY_INCREASE = 205;              // Maximum opacity boost for active boxes
const OPACITY_PER_TEST = 20;                   // How much opacity increases per test

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(preferences, extension) {
            super._init(0.0, _('Monkeytype Streak'));

            this.menu.setSourceAlignment(0);

            this._preferences = preferences;
            this._extension = extension;
            this._prefsChangedId = null;
            this._boxes = [];
            this._refreshTimeoutId = null;
            this._testSection = null;
            this._separator = null;
            this._soupSession = new Soup.Session();

            this._buildUI();
            this._setupMenuItems();
            this._updateTypingDisplay();

            this._prefsChangedId = this._preferences.connectChanged(() => {
                this._clearTestInfoItems();
                this._updateTypingDisplay().finally(() => {
                    this._refreshMenu();
                });
            });

            // Listen for days-to-show changes to rebuild UI
            this._daysChangedId = this._preferences._settings.connect('changed::days-to-show', () => {
                this._rebuildBoxes();
                this._clearTestInfoItems();
                this._updateTypingDisplay().finally(() => {
                    this._refreshMenu();
                });
            });
        }

        _buildUI() {
            // Create the main container that holds our week of test boxes
            const containerBox = new St.BoxLayout({
                vertical: true,
                x_expand: false,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                reactive: true
            });

            // Horizontal row that will contain all day boxes
            const hbox = new St.BoxLayout({
                x_expand: false,
                y_expand: false,
                y_align: Clutter.ActorAlign.CENTER
            });

            this._hbox = hbox; // Store reference to update later
            this._containerBox = containerBox; // Store reference for event handling
            this._rebuildBoxes();

            containerBox.add_child(hbox);
            this.add_child(containerBox);         // Add to the panel button

            // Add right-click handler to open Monkeytype
            containerBox.connect('button-press-event', (actor, event) => {
                if (event.get_button() === 3) { // Right mouse button
                    this._openMonkeytype();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });
        }

        _rebuildBoxes() {
            // Clear existing boxes
            if (this._boxes) {
                this._boxes.forEach(box => {
                    if (box.get_parent()) {
                        box.get_parent().destroy();
                    }
                });
            }
            this._boxes = [];

            // Get number of days to show from settings
            const daysToShow = this._preferences.daysToShow || 7;

            // Create boxes for the specified number of days
            for (let i = 0; i < daysToShow; i++) {
                // Container for each individual day box
                const boxContainer = new St.Widget({
                    layout_manager: new Clutter.BinLayout(),
                    x_expand: false,
                    y_expand: false,
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: `margin-right: ${BOX_MARGIN}px;`
                });

                // The actual visual box that shows typing activity
                const box = new St.Widget({
                    style_class: 'test-box',
                    height: BOX_SIZE,
                    width: BOX_SIZE,
                    style: this._getBoxStyle(COLORS.DEFAULT, true), // Start with empty styling
                    opacity: DEFAULT_OPACITY,
                });

                boxContainer.add_child(box);
                this._boxes.push(box);            // Keep track of all boxes for updates
                this._hbox.add_child(boxContainer);
            }
        }

        _setupMenuItems() {
            // Add "Refresh Now" button to the dropdown menu
            const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Now'));
            refreshItem.connect('activate', () => {
                // Show user we're working on it
                refreshItem.label.text = _('Refreshing...');

                // Clear old test info and fetch new data
                this._clearTestInfoItems();

                this._updateTypingDisplay().finally(() => {
                    // Reset button text when done
                    refreshItem.label.text = _('Refresh Now');
                    this._refreshMenu();
                });
            });
            this.menu.addMenuItem(refreshItem);

            // Add "Settings" button to open extension preferences
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                this._openPreferences()
            });
            this.menu.addMenuItem(settingsItem);
        }

        async _openPreferences() {
            try {
                await this._extension.openPreferences();
            } catch (e) {
                console.error('Failed to open preferences:', e);
                Main.notify(_('Error'), _(MESSAGES.PREFS_ERROR));
            }
        }

        _openMonkeytype() {
            try {
                const rightClickAction = this._preferences.rightClickAction;
                const username = this._preferences.monkeytypeUsername;
                
                let url = 'https://monkeytype.com';
                
                if (rightClickAction === 'profile' && username) {
                    url = `https://monkeytype.com/profile/${username}`;
                }
                
                Gio.AppInfo.launch_default_for_uri(url, null);
            } catch (e) {
                console.error('Failed to open Monkeytype:', e);
            }
        }

        _openUserProfile() {
            try {
                const username = this._preferences.monkeytypeUsername;
                
                if (!username) {
                    Main.notify(_('MonkeyBar'), _('Please set your Monkeytype username in settings'));
                    return;
                }
                
                const url = `https://monkeytype.com/profile/${username}`;
                Gio.AppInfo.launch_default_for_uri(url, null);
            } catch (e) {
                console.error('Failed to open user profile:', e);
            }
        }

        _refreshNow() {
            this._clearTestInfoItems();
            this._updateTypingDisplay().finally(() => {
                this._refreshMenu();
                Main.notify(_('MonkeyBar'), _('Typing activity refreshed'));
            });
        }

        _getBoxStyle(bgColor, isEmpty = false) {
            // Create the CSS styling for each test activity box
            let style = `background-color: ${bgColor}; width: ${BOX_SIZE}px; height: ${BOX_SIZE}px; border-radius: ${BORDER_RADIUS}px;`;
            
            // Add a very subtle border so boxes are always visible, even on pure black backgrounds
            style += ' border: 1px solid rgba(255, 255, 255, 0.08);';
            
            return style;
        }

        _getTestGrade(count) {
            // Determine how "intense" the color should be based on test count
            if (count === 0) return 'grade0';                              // No tests = lightest/empty
            if (count < TEST_THRESHOLDS.grade2) return 'grade1';           // 1-2 tests = light
            if (count < TEST_THRESHOLDS.grade3) return 'grade2';           // 3-5 tests = medium
            if (count < TEST_THRESHOLDS.grade4) return 'grade3';           // 6-10 tests = dark
            return 'grade4';                                                // 11+ tests = darkest
        }

        _getThemedColor(count, themeName, colorMode) {
            // Get the color scheme for the current theme
            const theme = THEMES[themeName] || THEMES.standard;
            
            if (colorMode === 'grade') {
                // Grade mode: different colors for different activity levels
                const grade = this._getTestGrade(count);
                return theme[grade];
            } else {
                // Opacity mode: same color for all, just varies transparency
                return count > 0 ? theme.grade3 : theme.grade0;
            }
        }

        _formatDateWithTests(date, count) {
            const today = new Date();
            const isToday = date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();

            const testText = count === 1 ? 'test' : 'tests';

            if (isToday) {
                return {
                    label: `Today: ${count} ${testText}`,
                };
            } else {
                const monthName = date.toLocaleString('en-US', DATE_FORMAT);
                const day = date.getDate();
                return {
                    label: `${monthName} ${day}: ${count} ${testText}`,
                };
            }
        }

        _updateTestInfoSection(dates, counts) {
            if (!this._testSection) {
                this._testSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(this._testSection, 0);

                this._testItems = [];
            }

            // Clear existing items if count doesn't match
            if (this._testItems.length !== dates.length) {
                this._testItems.forEach(item => {
                    if (item.bin && item.bin.get_parent()) {
                        item.bin.get_parent().remove_child(item.bin);
                    }
                });
                this._testItems = [];

                // Create new items for the current days count
                for (let i = 0; i < dates.length; i++) {
                    const textItem = new St.Label({
                        text: '',
                        style_class: 'test-text-item',
                        x_align: Clutter.ActorAlign.START,
                        y_align: Clutter.ActorAlign.CENTER,
                        style: 'font-family: monospace;'
                    });

                    const itemBin = new St.BoxLayout({
                        style_class: 'popup-menu-item',
                        reactive: false,
                        can_focus: false,
                        track_hover: false,
                        style: 'padding-top: 2px; padding-bottom: 2px;'
                    });

                    itemBin.add_child(textItem);
                    this._testSection.box.add_child(itemBin);
                    this._testItems.push({ bin: itemBin, label: textItem });
                }

                if (!this._separator) {
                    this._separator = new PopupMenu.PopupSeparatorMenuItem();
                    this.menu.addMenuItem(this._separator, 1);
                }
            }

            if (this._testItems) {
                dates.forEach((date, index) => {
                    const count = counts[index];
                    const { label } = this._formatDateWithTests(date, count);

                    if (this._testItems[index]) {
                        this._testItems[index].label.text = label;
                    }
                });
            }
        }

        async _updateTypingDisplay() {
            try {
                // Make sure we have boxes to update
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                // Get user's settings from the preferences
                const {
                    monkeytypeUsername: username,
                    monkeytypeApeKey: apeKey,
                    showCurrentWeekOnly,
                    weekStartDay,
                    highlightCurrentDay,
                    daysToShow
                } = this._preferences;

                // Can't do anything without at least a username
                if (!username) {
                    console.warn('Monkeytype Streak Extension: Username is not configured.');
                    this._setDefaultBoxAppearance();
                    return;
                }

                // Fetch typing activity data from Monkeytype API
                const result = await fetchTypingActivity(this._soupSession, username, apeKey, showCurrentWeekOnly, weekStartDay, daysToShow);

                // Double-check boxes still exist (user might have disabled extension)
                if (!this._boxes || !this._boxes.length) {
                    return;
                }

                // Check if we got streak-only data (no ApeKey provided)
                if (result && result.isStreakOnly) {
                    this._displayStreakOnly(result.streak, result.maxStreak);
                } else if (result && result.length === daysToShow) {
                    // We have detailed daily activity data
                    const dates = getDates(false, showCurrentWeekOnly, weekStartDay, daysToShow);

                    this._updateTestInfoSection(dates, result);

                    // Update each box with its test count and styling
                    result.forEach((count, index) => {
                        if (this._boxes[index]) {
                            const isToday = this._isToday(dates[index]);
                            const shouldHighlight = highlightCurrentDay && isToday;

                            this._setBoxAppearance(this._boxes[index], count, shouldHighlight);
                        }
                    });
                } else {
                    // Something went wrong with the Monkeytype API
                    console.error('Monkeytype Streak Extension: Failed to get valid data.');
                    this._setDefaultBoxAppearance();
                }
            } catch (e) {
                // Handle errors
                console.error(`Monkeytype Streak Extension: Error updating display - ${e.message}`);
                if (this._boxes && this._boxes.length) {
                    this._setDefaultBoxAppearance();
                }
            }

            // Set up the next automatic refresh
            this._scheduleNextRefresh();
            return Promise.resolve();
        }

        _isToday(date) {
            const today = new Date();
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }

        _setBoxAppearance(box, count = 0, highlight = false) {

            // Get current theme settings - map enum index to theme key according to schema
            const themeKeys = [
                'standard', 'githubDark', 'halloween', 'teal', 'leftPad', 
                'dracula', 'blue', 'panda', 'sunny', 'pink', 
                'solarizedDark', 'solarizedLight'
            ];
            const currentThemeName = themeKeys[this._preferences.themeName] || 'standard';
            
            // Convert user's color mode preference (number from settings) to mode name
            const colorModeNames = ['opacity', 'grade'];
            const currentColorMode = colorModeNames[this._preferences.colorMode] || 'opacity';
            
            // Get the appropriate color for this day's commit count
            let color = this._getThemedColor(count, currentThemeName, currentColorMode);
            const isEmpty = count === 0;
            
            // Special case: empty boxes get a subtle white fill so they're visible on dark backgrounds
            if (isEmpty) {
                color = 'rgba(255, 255, 255, 0.12)'; // Just enough white to see on pure black
            }
            
            let opacity = 255; // Default to full opacity
            
            if (currentColorMode === 'opacity') {
                // In opacity mode, boxes get more opaque with more tests
                opacity = count > 0
                    ? DEFAULT_OPACITY + Math.min(count * OPACITY_PER_TEST, MAX_OPACITY_INCREASE)
                    : 255; // Empty boxes stay fully opaque so the subtle fill is visible
            }

            if (highlight) {
                box.opacity = opacity;
                box.style = `${this._getBoxStyle(color, isEmpty)} border: 2px solid rgba(255, 255, 255, 0.6); box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);`;
            } else {
                // Regular days just get the themed color and opacity
                box.opacity = opacity;
                box.style = this._getBoxStyle(color, isEmpty);
            }
        }

        _scheduleNextRefresh() {
            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
            }

            const interval = this._preferences.refreshInterval;
            this._refreshTimeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval,
                () => {
                    this._updateContributionDisplay();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _clearTestInfoItems() {
            if (this._testItems) {
                this._testItems = [];
            }

            if (this._testSection) {
                try {
                    this._testSection.destroy();
                } catch (e) {
                    console.log('Error destroying test section:', e);
                }
                this._testSection = null;
            }

            if (this._separator) {
                try {
                    this._separator.destroy();
                } catch (e) {
                    console.log('Error destroying separator:', e);
                }
                this._separator = null;
            }
        }

        _displayStreakOnly(streak, maxStreak) {
            // Display streak as a simple number instead of weekly boxes
            this._boxes.forEach(box => {
                this._setBoxAppearance(box, 0, false);
            });

            this._clearTestInfoItems();

            const testSection = new PopupMenu.PopupMenuSection();
            
            const streakItem = new St.Label({
                text: `🔥 Current Streak: ${streak} day${streak !== 1 ? 's' : ''}`,
                style_class: 'test-text-item',
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 14px; font-weight: bold;'
            });

            const maxStreakItem = new St.Label({
                text: `📊 Max Streak: ${maxStreak} day${maxStreak !== 1 ? 's' : ''}`,
                style_class: 'test-text-item',
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 12px; padding-top: 4px;'
            });

            const noteItem = new St.Label({
                text: 'ℹ️  Add ApeKey in settings for detailed daily activity',
                style_class: 'test-text-item',
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 10px; padding-top: 8px; color: #888888;'
            });

            const streakBin = new St.BoxLayout({
                style_class: 'popup-menu-item',
                reactive: false,
                can_focus: false,
                track_hover: false,
                style: 'padding-top: 4px; padding-bottom: 2px;'
            });

            const maxStreakBin = new St.BoxLayout({
                style_class: 'popup-menu-item',
                reactive: false,
                can_focus: false,
                track_hover: false,
                style: 'padding-top: 2px; padding-bottom: 2px;'
            });

            const noteBin = new St.BoxLayout({
                style_class: 'popup-menu-item',
                reactive: false,
                can_focus: false,
                track_hover: false,
                style: 'padding-top: 2px; padding-bottom: 4px;'
            });

            streakBin.add_child(streakItem);
            maxStreakBin.add_child(maxStreakItem);
            noteBin.add_child(noteItem);

            testSection.box.add_child(streakBin);
            testSection.box.add_child(maxStreakBin);
            testSection.box.add_child(noteBin);

            this.menu.addMenuItem(testSection, 0);
            this._testSection = testSection;

            if (!this._separator) {
                this._separator = new PopupMenu.PopupSeparatorMenuItem();
                this.menu.addMenuItem(this._separator, 1);
            }
        }

        _setDefaultBoxAppearance() {
            this._boxes.forEach(box => {
                this._setBoxAppearance(box, 0, false);
            });

            this._clearTestInfoItems();

            const testSection = new PopupMenu.PopupMenuSection();
            const item = new PopupMenu.PopupMenuItem(MESSAGES.NO_TESTS);
            testSection.addMenuItem(item);
            this.menu.addMenuItem(testSection, 0);
            this._testSection = testSection;

            if (!this._separator) {
                this._separator = new PopupMenu.PopupSeparatorMenuItem();
                this.menu.addMenuItem(this._separator, 1);
            }
        }

        _refreshMenu() {
            if (this.menu.isOpen) {
                this.menu.close();
                this.menu.open();
            }
        }

        destroy() {
            this._boxes.forEach(box => {
                box.remove_all_transitions();
            });

            if (this._refreshTimeoutId) {
                GLib.Source.remove(this._refreshTimeoutId);
                this._refreshTimeoutId = null;
            }

            if (this._prefsChangedId) {
                this._preferences.disconnectChanged(this._prefsChangedId);
                this._prefsChangedId = null;
            }

            if (this._daysChangedId) {
                this._preferences._settings.disconnect(this._daysChangedId);
                this._daysChangedId = null;
            }

            if (this._soupSession) {
                this._soupSession.abort();
                this._soupSession = null;
            }

            this._clearTestInfoItems();
            this._boxes = null;
            this._cache = null;
            this._testItems = null;

            super.destroy();
        }
    });

export default class MonkeytypeStreakExtension extends Extension {
    enable() {
        // Set up user preferences and settings
        this._preferences = new ExtensionSettings(this);

        // Listen for changes to panel position settings so we can move the indicator
        this._positionChangedId = this._preferences._settings.connect('changed', (settings, key) => {
            if (key === 'panel-position' || key === 'panel-index') {
                this._updateIndicatorPosition();
            } else if (key.startsWith('shortcut-')) {
                // Reapply shortcuts when they change
                this._setupShortcuts();
            }
        });

        // Set up keyboard shortcuts
        this._setupShortcuts();

        // Wait a bit before creating the indicator to ensure GNOME Shell is ready
        // This prevents issues during login/startup
        this._enableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            if (this._preferences) {
                this._indicator = new Indicator(this._preferences, this);
                this._updateIndicatorPosition();
            }
            this._enableTimeoutId = null;
            return GLib.SOURCE_REMOVE; // Don't repeat this timeout
        });
    }

    _setupShortcuts() {
        // Remove existing shortcuts first
        this._removeShortcuts();

        // Get the settings
        const settings = this._preferences._settings;

        // Set up the three keyboard shortcuts
        this._shortcutActions = [];

        // Shortcut 1: Refresh Now
        const refreshShortcut = settings.get_strv('shortcut-refresh');
        if (refreshShortcut && refreshShortcut.length > 0 && refreshShortcut[0]) {
            const refreshAction = Main.wm.addKeybinding(
                'shortcut-refresh',
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    if (this._indicator) {
                        this._indicator._refreshNow();
                    }
                }
            );
            this._shortcutActions.push('shortcut-refresh');
        }

        // Shortcut 2: Open Monkeytype (homepage or profile based on right-click action)
        const openMonkeytypeShortcut = settings.get_strv('shortcut-open-monkeytype');
        if (openMonkeytypeShortcut && openMonkeytypeShortcut.length > 0 && openMonkeytypeShortcut[0]) {
            const openMonkeytypeAction = Main.wm.addKeybinding(
                'shortcut-open-monkeytype',
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    if (this._indicator) {
                        this._indicator._openMonkeytype();
                    }
                }
            );
            this._shortcutActions.push('shortcut-open-monkeytype');
        }

        // Shortcut 3: Open User Profile
        const openProfileShortcut = settings.get_strv('shortcut-open-profile');
        if (openProfileShortcut && openProfileShortcut.length > 0 && openProfileShortcut[0]) {
            const openProfileAction = Main.wm.addKeybinding(
                'shortcut-open-profile',
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    if (this._indicator) {
                        this._indicator._openUserProfile();
                    }
                }
            );
            this._shortcutActions.push('shortcut-open-profile');
        }
    }

    _removeShortcuts() {
        if (this._shortcutActions) {
            this._shortcutActions.forEach(action => {
                Main.wm.removeKeybinding(action);
            });
            this._shortcutActions = [];
        }
    }

    _updateIndicatorPosition() {
        // Don't do anything if there's no indicator yet
        if (!this._indicator) return;

        // Convert user's position preference to actual panel position
        const position = ['left', 'center', 'right'][this._preferences.panelPosition] || 'right';
        const index = this._preferences.panelIndex || 0;

        // Remove the old indicator from the panel
        this._indicator.destroy();
        this._indicator = null;

        // Create a new indicator in the new position
        if (this._preferences) {
            this._indicator = new Indicator(this._preferences, this);
            Main.panel.addToStatusArea(this.uuid, this._indicator, index, position);
        }
    }

    disable() {
        // Clean up any pending timeout from the enable phase
        if (this._enableTimeoutId) {
            GLib.Source.remove(this._enableTimeoutId);
            this._enableTimeoutId = null;
        }

        // Remove keyboard shortcuts
        this._removeShortcuts();

        // Stop listening for settings changes
        if (this._positionChangedId) {
            this._preferences._settings.disconnect(this._positionChangedId);
            this._positionChangedId = null;
        }

        // Remove the indicator from the panel
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Clean up preferences
        this._preferences = null;
    }
}
