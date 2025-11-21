import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import About from './helpers/about.js';

export default class MonkeytypeStreakPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // ==================== Settings Page ====================
        const settingsPage = new Adw.PreferencesPage();
        settingsPage.set_title(_('Settings'));
        settingsPage.set_icon_name('preferences-system-symbolic');

        // Credentials Group
        const credentialsGroup = new Adw.PreferencesGroup();
        credentialsGroup.set_title(_('Monkeytype Credentials'));
        credentialsGroup.set_description(_('Enter your Monkeytype username and ApeKey'));

        const usernameRow = new Adw.EntryRow({
            title: _('Monkeytype Username'),
            text: settings.get_string('monkeytype-username') || ''
        });
        usernameRow.connect('notify::text', () => {
            settings.set_string('monkeytype-username', usernameRow.text);
        });
        credentialsGroup.add(usernameRow);

        const apeKeyRow = new Adw.PasswordEntryRow({
            title: _('Monkeytype ApeKey'),
            text: settings.get_string('monkeytype-apekey') || ''
        });
        apeKeyRow.connect('notify::text', () => {
            settings.set_string('monkeytype-apekey', apeKeyRow.text);
        });
        credentialsGroup.add(apeKeyRow);

        settingsPage.add(credentialsGroup);

        // Auto Update Group
        const refreshGroup = new Adw.PreferencesGroup();
        refreshGroup.set_title(_('Auto Update Settings'));

        const intervalRow = new Adw.ComboRow({
            title: _('Refresh Interval'),
            subtitle: _('How often to check for new typing activity?')
        });

        const intervals = [
            { value: 900, label: _('15 minutes') },
            { value: 1800, label: _('30 minutes') },
            { value: 3600, label: _('1 hour') },
            { value: 7200, label: _('2 hours') },
            { value: 14400, label: _('4 hours') },
            { value: 21600, label: _('6 hours') },
            { value: 43200, label: _('12 hours') },
            { value: 86400, label: _('24 hours') }
        ];

        const intervalModel = new Gtk.StringList();
        intervals.forEach(interval => intervalModel.append(interval.label));
        intervalRow.model = intervalModel;

        const currentInterval = settings.get_int('refresh-interval');
        let activeIndex = intervals.findIndex(interval => interval.value === currentInterval);
        if (activeIndex === -1) activeIndex = 5;
        intervalRow.selected = activeIndex;

        intervalRow.connect('notify::selected', () => {
            settings.set_int('refresh-interval', intervals[intervalRow.selected].value);
        });

        refreshGroup.add(intervalRow);
        settingsPage.add(refreshGroup);

        // Panel Position Group
        const positionGroup = new Adw.PreferencesGroup();
        positionGroup.set_title(_('Panel Position'));
        positionGroup.set_description(_('Customize the position of the extension in the panel'));

        const positionRow = new Adw.ComboRow({
            title: _('Location'),
            subtitle: _('Which section of the panel to use')
        });

        const positions = [
            { value: 0, label: _('Left') },
            { value: 1, label: _('Center') },
            { value: 2, label: _('Right') }
        ];

        const positionModel = new Gtk.StringList();
        positions.forEach(position => positionModel.append(position.label));
        positionRow.model = positionModel;

        const currentPosition = settings.get_enum('panel-position');
        positionRow.selected = currentPosition;

        positionRow.connect('notify::selected', () => {
            settings.set_enum('panel-position', positionRow.selected);
        });

        positionGroup.add(positionRow);

        const indexRow = new Adw.SpinRow({
            title: _('Index'),
            subtitle: _('Position within the chosen section (0 is leftmost)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 20,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('panel-index')
            })
        });

        indexRow.connect('notify::value', () => {
            settings.set_int('panel-index', indexRow.value);
        });

        positionGroup.add(indexRow);
        settingsPage.add(positionGroup);

        // Interaction Group
        const interactionGroup = new Adw.PreferencesGroup();
        interactionGroup.set_title(_('Interaction'));
        interactionGroup.set_description(_('Configure how you interact with the extension'));

        const rightClickActionRow = new Adw.ComboRow({
            title: _('Right-click action'),
            subtitle: _('What to open when right-clicking the extension')
        });

        const rightClickActions = [
            { value: 'profile', label: _('Open Profile') },
            { value: 'homepage', label: _('Open Homepage') }
        ];

        const rightClickModel = new Gtk.StringList();
        rightClickActions.forEach(action => rightClickModel.append(action.label));
        rightClickActionRow.model = rightClickModel;

        const currentAction = settings.get_string('right-click-action');
        const actionIndex = rightClickActions.findIndex(action => action.value === currentAction);
        rightClickActionRow.selected = actionIndex >= 0 ? actionIndex : 0;

        rightClickActionRow.connect('notify::selected', () => {
            settings.set_string('right-click-action', rightClickActions[rightClickActionRow.selected].value);
        });

        interactionGroup.add(rightClickActionRow);
        settingsPage.add(interactionGroup);

        // Keyboard Shortcuts Group
        const shortcutsGroup = new Adw.PreferencesGroup();
        shortcutsGroup.set_title(_('Keyboard Shortcuts'));
        shortcutsGroup.set_description(_('Configure custom keyboard shortcuts for quick actions'));

        // Refresh shortcut
        const refreshShortcutRow = new Adw.ActionRow({
            title: _('Refresh Now'),
            subtitle: _('Shortcut to refresh typing activity')
        });
        const refreshShortcutButton = this._createShortcutButton(
            settings,
            'shortcut-refresh',
            _('Set Shortcut')
        );
        refreshShortcutRow.add_suffix(refreshShortcutButton);
        refreshShortcutRow.activatable_widget = refreshShortcutButton;
        shortcutsGroup.add(refreshShortcutRow);

        // Open Monkeytype shortcut
        const openMonkeytypeShortcutRow = new Adw.ActionRow({
            title: _('Open Monkeytype'),
            subtitle: _('Shortcut to open Monkeytype (homepage or profile)')
        });
        const openMonkeytypeShortcutButton = this._createShortcutButton(
            settings,
            'shortcut-open-monkeytype',
            _('Set Shortcut')
        );
        openMonkeytypeShortcutRow.add_suffix(openMonkeytypeShortcutButton);
        openMonkeytypeShortcutRow.activatable_widget = openMonkeytypeShortcutButton;
        shortcutsGroup.add(openMonkeytypeShortcutRow);

        // Open User Profile shortcut
        const openProfileShortcutRow = new Adw.ActionRow({
            title: _('Open User Profile'),
            subtitle: _('Shortcut to open your Monkeytype profile')
        });
        const openProfileShortcutButton = this._createShortcutButton(
            settings,
            'shortcut-open-profile',
            _('Set Shortcut')
        );
        openProfileShortcutRow.add_suffix(openProfileShortcutButton);
        openProfileShortcutRow.activatable_widget = openProfileShortcutButton;
        shortcutsGroup.add(openProfileShortcutRow);

        settingsPage.add(shortcutsGroup);

        // Info Group (Bottom)
        const settingsSpacer = new Adw.PreferencesGroup();
        settingsSpacer.set_vexpand(true);
        settingsPage.add(settingsSpacer);

        const infoGroup = new Adw.PreferencesGroup();
        infoGroup.set_vexpand(false);
        infoGroup.set_valign(Gtk.Align.END);

        const infoRow = new Adw.ActionRow({
            title: _('About ApeKeys'),
            subtitle: _('Generate an ApeKey from your Monkeytype account settings.')
        });

        const linkButton = new Gtk.LinkButton({
            label: _('Open Monkeytype Settings'),
            uri: 'https://monkeytype.com/account-settings?tab=apeKeys'
        });
        infoRow.add_suffix(linkButton);
        infoGroup.add(infoRow);
        settingsPage.add(infoGroup);

        // ==================== Display Page ====================
        const displayPage = new Adw.PreferencesPage();
        displayPage.set_title(_('Display'));
        displayPage.set_icon_name('video-display-symbolic');

        // General Display Group
        const displayGeneralGroup = new Adw.PreferencesGroup();
        displayGeneralGroup.set_title(_('General'));
        displayGeneralGroup.set_description(_('Configure how typing activity is displayed'));

        const daysToShowRow = new Adw.SpinRow({
            title: _('Days to show'),
            subtitle: _('Number of days to display in the top bar (1-7)'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 7,
                step_increment: 1,
                page_increment: 1,
                value: settings.get_int('days-to-show')
            })
        });

        daysToShowRow.connect('notify::value', () => {
            settings.set_int('days-to-show', daysToShowRow.value);
        });

        displayGeneralGroup.add(daysToShowRow);

        const highlightCurrentDayRow = new Adw.SwitchRow({
            title: _('Highlight current day'),
            subtitle: _('Add a white border around the current day\'s box')
        });
        highlightCurrentDayRow.set_active(settings.get_boolean('highlight-current-day'));
        highlightCurrentDayRow.connect('notify::active', () => {
            settings.set_boolean('highlight-current-day', highlightCurrentDayRow.get_active());
        });
        displayGeneralGroup.add(highlightCurrentDayRow);

        displayPage.add(displayGeneralGroup);

        // Week Display Group
        const weekGroup = new Adw.PreferencesGroup();
        weekGroup.set_title(_('Week Display'));

        const showWeekOnlyRow = new Adw.SwitchRow({
            title: _('Show current week\'s tests only'),
            subtitle: _('Display tests for the current week instead of the last N days')
        });
        showWeekOnlyRow.set_active(settings.get_boolean('show-current-week-only'));
        showWeekOnlyRow.connect('notify::active', () => {
            settings.set_boolean('show-current-week-only', showWeekOnlyRow.get_active());
        });
        weekGroup.add(showWeekOnlyRow);

        const weekStartRow = new Adw.ComboRow({
            title: _('Week starts on'),
            subtitle: _('Select which day the week begins')
        });

        const weekDays = [
            _('Sunday'),
            _('Monday'),
            _('Tuesday'),
            _('Wednesday'),
            _('Thursday'),
            _('Friday'),
            _('Saturday')
        ];

        const weekDayModel = new Gtk.StringList();
        weekDays.forEach(day => weekDayModel.append(day));
        weekStartRow.model = weekDayModel;
        weekStartRow.selected = settings.get_enum('week-start-day');

        weekStartRow.connect('notify::selected', () => {
            settings.set_enum('week-start-day', weekStartRow.selected);
        });

        weekStartRow.set_sensitive(showWeekOnlyRow.get_active());
        showWeekOnlyRow.connect('notify::active', () => {
            weekStartRow.set_sensitive(showWeekOnlyRow.get_active());
        });

        weekGroup.add(weekStartRow);
        displayPage.add(weekGroup);

        // Theme Group
        const themeGroup = new Adw.PreferencesGroup();
        themeGroup.set_title(_('Color'));

        const colorModeRow = new Adw.ComboRow({
            title: _('Mode'),
            subtitle: _('Choose between opacity-based or grade-based coloring')
        });

        const colorModes = [
            _('Opacity Mode'),
            _('Grade Mode')
        ];

        const colorModeModel = new Gtk.StringList();
        colorModes.forEach(mode => colorModeModel.append(mode));
        colorModeRow.model = colorModeModel;
        colorModeRow.selected = settings.get_enum('color-mode');

        colorModeRow.connect('notify::selected', () => {
            settings.set_enum('color-mode', colorModeRow.selected);
        });

        themeGroup.add(colorModeRow);

        const themeRow = new Adw.ComboRow({
            title: _('Theme'),
            subtitle: _('Select a color theme for typing activity visualization')
        });

        const themes = [
            { key: 'standard', label: _('Monkeytype') },
            { key: 'githubDark', label: _('GitHub Green') },
            { key: 'halloween', label: _('Halloween') },
            { key: 'teal', label: _('Teal') },
            { key: 'leftPad', label: _('@left_pad') },
            { key: 'dracula', label: _('Dracula') },
            { key: 'blue', label: _('Blue') },
            { key: 'panda', label: _('Panda 🐼') },
            { key: 'sunny', label: _('Sunny') },
            { key: 'pink', label: _('Pink') },
            { key: 'solarizedDark', label: _('Solarized Dark') },
            { key: 'solarizedLight', label: _('Solarized Light') }
        ];

        const themeModel = new Gtk.StringList();
        themes.forEach(theme => themeModel.append(theme.label));
        themeRow.model = themeModel;
        themeRow.selected = settings.get_enum('theme-name');

        themeRow.connect('notify::selected', () => {
            settings.set_enum('theme-name', themeRow.selected);
        });

        themeGroup.add(themeRow);
        displayPage.add(themeGroup);

        // Add pages to window
        window.add(settingsPage);
        window.add(displayPage);
        window.add(new About(this));
        
        window.set_title(_('MonkeyBar'));
        window.set_default_size(650, 750);
    }

    _createShortcutButton(settings, key, label) {
        const button = new Gtk.Button({
            has_frame: true,
            valign: Gtk.Align.CENTER,
        });

        const updateButtonLabel = () => {
            const shortcut = settings.get_strv(key);
            if (shortcut && shortcut.length > 0 && shortcut[0]) {
                button.label = this._formatShortcut(shortcut[0]);
            } else {
                button.label = label;
            }
        };

        updateButtonLabel();

        button.connect('clicked', () => {
            const dialog = new Gtk.Dialog({
                title: _('Set Keyboard Shortcut'),
                modal: true,
                transient_for: button.get_root(),
            });

            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            const clearButton = dialog.add_button(_('Clear'), Gtk.ResponseType.REJECT);
            clearButton.get_style_context().add_class('destructive-action');

            const contentArea = dialog.get_content_area();
            contentArea.set_margin_top(12);
            contentArea.set_margin_bottom(12);
            contentArea.set_margin_start(12);
            contentArea.set_margin_end(12);

            const instructionLabel = new Gtk.Label({
                label: _('Press any key combination...'),
                wrap: true,
                justify: Gtk.Justification.CENTER,
            });
            contentArea.append(instructionLabel);

            const shortcutLabel = new Gtk.Label({
                label: '',
                wrap: true,
                justify: Gtk.Justification.CENTER,
                margin_top: 12,
            });
            shortcutLabel.get_style_context().add_class('title-2');
            contentArea.append(shortcutLabel);

            let capturedShortcut = null;

            const eventController = new Gtk.EventControllerKey();
            eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
                const mask = state & Gtk.accelerator_get_default_mod_mask();
                
                // Ignore modifier-only presses
                if (keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
                    keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
                    keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
                    keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R) {
                    return false;
                }

                // Must have at least one modifier
                if (mask === 0) {
                    shortcutLabel.label = _('Please use at least one modifier key (Ctrl, Alt, Super, Shift)');
                    return true;
                }

                const shortcut = Gtk.accelerator_name(keyval, mask);
                capturedShortcut = shortcut;
                shortcutLabel.label = this._formatShortcut(shortcut);

                // Auto-close dialog after capturing
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    dialog.response(Gtk.ResponseType.OK);
                    return GLib.SOURCE_REMOVE;
                });

                return true;
            });

            dialog.add_controller(eventController);

            dialog.connect('response', (dialog, response) => {
                if (response === Gtk.ResponseType.OK && capturedShortcut) {
                    settings.set_strv(key, [capturedShortcut]);
                    updateButtonLabel();
                } else if (response === Gtk.ResponseType.REJECT) {
                    settings.set_strv(key, []);
                    updateButtonLabel();
                }
                dialog.close();
            });

            dialog.present();
        });

        // Update button when settings change
        settings.connect(`changed::${key}`, updateButtonLabel);

        return button;
    }

    _formatShortcut(shortcut) {
        if (!shortcut) return _('Disabled');
        
        return shortcut
            .replace('<Super>', 'Super+')
            .replace('<Primary>', 'Ctrl+')
            .replace('<Control>', 'Ctrl+')
            .replace('<Shift>', 'Shift+')
            .replace('<Alt>', 'Alt+')
            .replace('>', '')
            .replace('<', '');
    }
}
