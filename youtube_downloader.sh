#!/bin/bash

# ============================================================
# Multi-Platform Video Downloader Script (v3.0)
# سكربت تحميل فيديوهات من منصات متعددة
# المنصات: YouTube, Vimeo, Twitter/X, TikTok, Instagram,
#          Facebook, Dailymotion, Twitch, Reddit, ...
# يدعم: فيديو واحد - قائمة تشغيل - تحميل دفعي من ملف
#       اختيار الدقة - تحويل MP3 (بجودات متعددة) - الترجمة
#       شريط التقدم - إشعارات النظام - ملفات log منفصلة
# ============================================================

# الألوان للإخراج
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# متغيرات عامة
DOWNLOAD_TYPE=""
FORMAT_CODE=""
AUDIO_QUALITY=""        # 🆕 جودة MP3
SUB_LANG=""
WANT_SUBS=""
SAVE_PATH=""
USE_COOKIES=""
COOKIES_BROWSER=""
DETECTED_PLATFORM=""    # 🆕 المنصة المكتشفة

# 🆕 إعدادات السجلات (Logs)
LOGS_DIR="$HOME/.youtube_downloader_logs"
SESSION_LOG=""          # سجل الجلسة الحالية
SESSION_ID=""

# ============================================================
# 🆕 تهيئة نظام السجلات
# ============================================================
init_logging() {
    mkdir -p "$LOGS_DIR"
    SESSION_ID=$(date +%Y%m%d_%H%M%S)_$$
    SESSION_LOG="$LOGS_DIR/session_${SESSION_ID}.log"

    # كتابة هيدر السجل
    {
        echo "================================================================"
        echo "  Multi-Platform Video Downloader - Session Log"
        echo "================================================================"
        echo "  Session ID  : $SESSION_ID"
        echo "  Started At  : $(date '+%Y-%m-%d %H:%M:%S')"
        echo "  User        : $(whoami)"
        echo "  Hostname    : $(hostname)"
        echo "  OS          : $(uname -s) $(uname -r)"
        echo "  Working Dir : $(pwd)"
        echo "================================================================"
        echo ""
    } > "$SESSION_LOG"
}

# 🆕 دالة الكتابة في السجل
log_msg() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$SESSION_LOG"
}

log_info()    { log_msg "INFO"    "$1"; }
log_warn()    { log_msg "WARN"    "$1"; }
log_error()   { log_msg "ERROR"   "$1"; }
log_success() { log_msg "SUCCESS" "$1"; }

# ============================================================
# طباعة العنوان
# ============================================================
print_header() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║   🎬  Multi-Platform Video Downloader v3.0  🎬           ║"
    echo "║   YouTube • Vimeo • TikTok • Twitter • Instagram • +     ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_separator() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
}

# ============================================================
# إشعار النظام
# ============================================================
send_notification() {
    local title="$1"
    local message="$2"
    local icon="$3"

    if command -v notify-send &> /dev/null; then
        notify-send -i "${icon:-video-x-generic}" "$title" "$message"
    elif command -v osascript &> /dev/null; then
        osascript -e "display notification \"$message\" with title \"$title\" sound name \"Glass\""
    elif command -v powershell.exe &> /dev/null; then
        powershell.exe -Command "
        Add-Type -AssemblyName System.Windows.Forms
        \$notify = New-Object System.Windows.Forms.NotifyIcon
        \$notify.Icon = [System.Drawing.SystemIcons]::Information
        \$notify.Visible = \$true
        \$notify.ShowBalloonTip(5000, '$title', '$message', 'Info')
        " 2>/dev/null
    fi
    echo -e "\a"
}

# ============================================================
# 🆕 كشف المنصة من الرابط
# ============================================================
detect_platform() {
    local url="$1"
    local platform="Unknown"
    local platform_emoji="🌐"

    if [[ "$url" =~ youtube\.com|youtu\.be ]]; then
        platform="YouTube"
        platform_emoji="📺"
    elif [[ "$url" =~ vimeo\.com ]]; then
        platform="Vimeo"
        platform_emoji="🎞️"
    elif [[ "$url" =~ tiktok\.com ]]; then
        platform="TikTok"
        platform_emoji="🎵"
    elif [[ "$url" =~ twitter\.com|x\.com ]]; then
        platform="Twitter/X"
        platform_emoji="🐦"
    elif [[ "$url" =~ instagram\.com ]]; then
        platform="Instagram"
        platform_emoji="📸"
    elif [[ "$url" =~ facebook\.com|fb\.watch ]]; then
        platform="Facebook"
        platform_emoji="👥"
    elif [[ "$url" =~ dailymotion\.com|dai\.ly ]]; then
        platform="Dailymotion"
        platform_emoji="🎥"
    elif [[ "$url" =~ twitch\.tv ]]; then
        platform="Twitch"
        platform_emoji="🟣"
    elif [[ "$url" =~ reddit\.com ]]; then
        platform="Reddit"
        platform_emoji="🔶"
    elif [[ "$url" =~ soundcloud\.com ]]; then
        platform="SoundCloud"
        platform_emoji="🔊"
    elif [[ "$url" =~ bilibili\.com ]]; then
        platform="Bilibili"
        platform_emoji="📡"
    fi

    DETECTED_PLATFORM="$platform"
    echo "$platform_emoji $platform"
}

# ============================================================
# التحقق من المتطلبات + curl_cffi
# ============================================================
check_requirements() {
    local missing_tools=()

    if ! command -v yt-dlp &> /dev/null; then
        missing_tools+=("yt-dlp")
    fi

    if ! command -v ffmpeg &> /dev/null; then
        missing_tools+=("ffmpeg")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}${BOLD}❌ الأدوات التالية غير مثبتة:${NC}"
        for tool in "${missing_tools[@]}"; do
            echo -e "   ${YELLOW}• $tool${NC}"
        done
        echo ""
        echo -e "${CYAN}${BOLD}طرق التثبيت:${NC}"
        echo -e "${GREEN}  Ubuntu/Debian:${NC} sudo apt install yt-dlp ffmpeg"
        echo -e "${GREEN}  Fedora:${NC}        sudo dnf install yt-dlp ffmpeg"
        echo -e "${GREEN}  Arch:${NC}          sudo pacman -S yt-dlp ffmpeg"
        echo -e "${GREEN}  macOS:${NC}         brew install yt-dlp ffmpeg"
        echo -e "${GREEN}  pip:${NC}           pip install -U yt-dlp"
        echo ""
        log_error "Missing required tools: ${missing_tools[*]}"
        read -p "هل تريد محاولة التثبيت تلقائياً عبر pip؟ (y/n): " install_choice
        if [[ "$install_choice" =~ ^[Yy]$ ]]; then
            pip install -U yt-dlp || pip3 install -U yt-dlp
        else
            exit 1
        fi
    fi

    check_impersonation
}

# ============================================================
# التحقق من دعم impersonation
# ============================================================
check_impersonation() {
    local impersonate_check
    impersonate_check=$(yt-dlp --list-impersonate-targets 2>/dev/null | head -5)

    if [ -z "$impersonate_check" ] || echo "$impersonate_check" | grep -qi "no impersonate"; then
        echo -e "${YELLOW}⚠️  تنبيه: مكتبة impersonation غير مثبتة${NC}"
        echo -e "${YELLOW}   هذه المكتبة تساعد على تجاوز قيود المنصات${NC}"
        log_warn "curl_cffi (impersonation) is not installed"
        echo ""
        read -p "$(echo -e ${CYAN}'هل تريد تثبيتها الآن (curl_cffi)؟ (y/n): '${NC})" inst_imp
        if [[ "$inst_imp" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}⏳ جاري التثبيت...${NC}"
            if command -v pip3 &> /dev/null; then
                pip3 install -U "yt-dlp[default]" curl_cffi 2>/dev/null || \
                pip3 install --user -U "yt-dlp[default]" curl_cffi 2>/dev/null || \
                pip3 install --break-system-packages -U "yt-dlp[default]" curl_cffi 2>/dev/null
            elif command -v pip &> /dev/null; then
                pip install -U "yt-dlp[default]" curl_cffi 2>/dev/null || \
                pip install --user -U "yt-dlp[default]" curl_cffi 2>/dev/null || \
                pip install --break-system-packages -U "yt-dlp[default]" curl_cffi 2>/dev/null
            fi
            echo -e "${GREEN}✅ تم! إذا فشل، جرب يدوياً:${NC}"
            echo -e "   ${CYAN}pip install -U \"yt-dlp[default]\" curl_cffi${NC}"
            echo ""
        fi
    else
        log_info "curl_cffi is available"
    fi
}

# ============================================================
# سؤال الكوكيز
# ============================================================
ask_cookies_option() {
    echo ""
    print_separator
    echo -e "${YELLOW}${BOLD}🍪 الكوكيز (اختياري - يساعد على تجاوز القيود)${NC}"
    print_separator
    echo -e "${CYAN}مفيد جداً للمنصات: YouTube, Instagram, Twitter, Facebook${NC}"
    echo ""
    echo -e "  ${CYAN}1) لا، تخطي${NC}"
    echo -e "  ${CYAN}2) Chrome${NC}"
    echo -e "  ${CYAN}3) Firefox${NC}"
    echo -e "  ${CYAN}4) Safari${NC}"
    echo -e "  ${CYAN}5) Edge${NC}"
    echo -e "  ${CYAN}6) Brave${NC}"
    echo ""
    read -p "$(echo -e ${CYAN}'اختر (1-6) [الافتراضي 1]: '${NC})" cookie_choice
    cookie_choice=${cookie_choice:-1}

    USE_COOKIES=""
    COOKIES_BROWSER=""
    case "$cookie_choice" in
        2) USE_COOKIES="yes"; COOKIES_BROWSER="chrome" ;;
        3) USE_COOKIES="yes"; COOKIES_BROWSER="firefox" ;;
        4) USE_COOKIES="yes"; COOKIES_BROWSER="safari" ;;
        5) USE_COOKIES="yes"; COOKIES_BROWSER="edge" ;;
        6) USE_COOKIES="yes"; COOKIES_BROWSER="brave" ;;
        *) USE_COOKIES="" ;;
    esac

    if [ -n "$USE_COOKIES" ]; then
        echo -e "${GREEN}✅ سيتم استخدام كوكيز $COOKIES_BROWSER${NC}"
        log_info "Using cookies from browser: $COOKIES_BROWSER"
    else
        log_info "Cookies: disabled"
    fi
}

# ============================================================
# 🆕 التحقق من صحة الرابط (يقبل أي منصة مدعومة)
# ============================================================
validate_url() {
    local url="$1"
    # نتحقق فقط من أنه URL صحيح (http/https)
    if [[ "$url" =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

is_playlist_url() {
    local url="$1"
    if [[ "$url" == *"list="* || "$url" == *"/playlist"* || "$url" == *"/sets/"* ]]; then
        return 0
    else
        return 1
    fi
}

# ============================================================
# اختيار النوع والدقة + 🆕 جودة الصوت
# ============================================================
choose_format_and_quality() {
    local sample_url="$1"
    local show_formats="$2"

    echo ""
    print_separator
    echo -e "${YELLOW}${BOLD}📌 اختر نوع التحميل${NC}"
    print_separator
    echo -e "${CYAN}  1) 🎬 فيديو (MP4) - بدقة معينة${NC}"
    echo -e "${CYAN}  2) 🎵 صوت فقط (MP3)${NC}"
    echo ""

    while true; do
        read -p "$(echo -e ${CYAN}'اختر (1 أو 2): '${NC})" DOWNLOAD_TYPE
        if [[ "$DOWNLOAD_TYPE" == "1" || "$DOWNLOAD_TYPE" == "2" ]]; then
            break
        else
            echo -e "${RED}❌ خيار غير صحيح! اختر 1 أو 2${NC}"
        fi
    done

    FORMAT_CODE=""
    AUDIO_QUALITY=""

    if [ "$DOWNLOAD_TYPE" == "1" ]; then
        # ========= فيديو =========
        if [ "$show_formats" == "yes" ] && [ -n "$sample_url" ]; then
            echo ""
            echo -e "${BLUE}⏳ جاري جلب الدقات المتاحة...${NC}"
            echo ""
            local list_cmd=(yt-dlp -F --no-warnings)
            [ -n "$USE_COOKIES" ] && list_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
            list_cmd+=("$sample_url")
            "${list_cmd[@]}" 2>/dev/null
            echo ""
            print_separator
            echo -e "${CYAN}من الجدول أعلاه، اكتب رقم الـ ${BOLD}format code${NC}${CYAN} (العمود الأول)${NC}"
        else
            echo ""
            echo -e "${YELLOW}💡 خيارات الجودة العامة:${NC}"
            echo -e "   ${BOLD}best${NC}    - أفضل دقة"
            echo -e "   ${BOLD}1080${NC}    - 1080p أو أقل"
            echo -e "   ${BOLD}720${NC}     - 720p أو أقل"
            echo -e "   ${BOLD}480${NC}     - 480p أو أقل"
            echo -e "   ${BOLD}360${NC}     - 360p أو أقل"
        fi
        echo -e "${YELLOW}💡 أو اكتب ${BOLD}best${NC}${YELLOW} للأفضل تلقائياً${NC}"
        read -p "$(echo -e ${CYAN}'➜ format code أو ارتفاع (مثل 720): '${NC})" FORMAT_CODE
        FORMAT_CODE=${FORMAT_CODE:-best}
        log_info "Video format selected: $FORMAT_CODE"
    else
        # ========= 🆕 جودة الصوت MP3 =========
        echo ""
        print_separator
        echo -e "${YELLOW}${BOLD}🎚️  اختر جودة الصوت (MP3)${NC}"
        print_separator
        echo -e "  ${CYAN}1) 128 kbps${NC} - حجم صغير، جودة عادية ${YELLOW}(للبودكاست)${NC}"
        echo -e "  ${CYAN}2) 192 kbps${NC} - متوازنة ${YELLOW}(الأكثر استخداماً)${NC}"
        echo -e "  ${CYAN}3) 256 kbps${NC} - جودة عالية"
        echo -e "  ${CYAN}4) 320 kbps${NC} - أعلى جودة ${YELLOW}(للموسيقى)${NC}"
        echo -e "  ${CYAN}5) أفضل جودة متاحة (Best)${NC} - يأخذ من المصدر مباشرة"
        echo ""
        while true; do
            read -p "$(echo -e ${CYAN}'اختر (1-5) [الافتراضي 2]: '${NC})" quality_choice
            quality_choice=${quality_choice:-2}
            case "$quality_choice" in
                1) AUDIO_QUALITY="128"; break ;;
                2) AUDIO_QUALITY="192"; break ;;
                3) AUDIO_QUALITY="256"; break ;;
                4) AUDIO_QUALITY="320"; break ;;
                5) AUDIO_QUALITY="0"; break ;;  # 0 = best in yt-dlp
                *) echo -e "${RED}❌ خيار غير صحيح! اختر من 1 إلى 5${NC}" ;;
            esac
        done

        if [ "$AUDIO_QUALITY" == "0" ]; then
            echo -e "${GREEN}✅ سيتم استخراج الصوت بأفضل جودة متاحة${NC}"
        else
            echo -e "${GREEN}✅ سيتم استخراج الصوت بجودة ${AUDIO_QUALITY} kbps${NC}"
        fi
        log_info "Audio quality selected: $AUDIO_QUALITY kbps"
    fi
}

# ============================================================
# اختيار الترجمة
# ============================================================
choose_subtitles() {
    local sample_url="$1"
    local list_subs="$2"

    echo ""
    print_separator
    echo -e "${YELLOW}${BOLD}📌 ملفات الترجمة${NC}"
    print_separator

    # تنبيه إذا كانت المنصة لا تدعم الترجمة عادةً
    if [[ "$DETECTED_PLATFORM" =~ ^(TikTok|Instagram|Twitter/X|Reddit|SoundCloud)$ ]]; then
        echo -e "${YELLOW}ℹ️  ملاحظة: $DETECTED_PLATFORM عادةً لا يحتوي على ملفات ترجمة${NC}"
    fi

    read -p "$(echo -e ${CYAN}'هل تريد تحميل ملفات الترجمة؟ (y/n): '${NC})" WANT_SUBS

    SUB_LANG=""
    if [[ "$WANT_SUBS" =~ ^[Yy]$ ]]; then
        if [ "$list_subs" == "yes" ] && [ -n "$sample_url" ]; then
            echo ""
            echo -e "${BLUE}⏳ جاري جلب اللغات المتاحة...${NC}"
            echo ""
            local sub_cmd=(yt-dlp --list-subs --no-warnings)
            [ -n "$USE_COOKIES" ] && sub_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
            sub_cmd+=("$sample_url")
            "${sub_cmd[@]}" 2>/dev/null | grep -E "^[a-zA-Z]" | head -100
            echo ""
        fi
        echo -e "${YELLOW}💡 أمثلة: ${BOLD}ar${NC}${YELLOW} (عربي)، ${BOLD}en${NC}${YELLOW} (إنجليزي)${NC}"
        echo -e "${YELLOW}💡 عدة لغات: ${BOLD}ar,en${NC}${YELLOW}  -  جميع اللغات: ${BOLD}all${NC}"
        read -p "$(echo -e ${CYAN}'➜ أدخل رمز/رموز اللغة: '${NC})" SUB_LANG
        SUB_LANG=${SUB_LANG:-en}
        echo -e "${GREEN}✅ سيتم تحميل الترجمة باللغة: $SUB_LANG${NC}"
        echo -e "${YELLOW}ℹ️  إذا فشلت الترجمة لن يتأثر تحميل الفيديو${NC}"
        log_info "Subtitles requested: $SUB_LANG"
    else
        log_info "Subtitles: disabled"
    fi
}

# ============================================================
# اختيار مسار الحفظ
# ============================================================
choose_save_path() {
    local default_subdir="$1"

    echo ""
    print_separator
    echo -e "${YELLOW}${BOLD}📌 مسار الحفظ${NC}"
    print_separator
    local default_path="$HOME/Downloads"
    if [ -n "$default_subdir" ]; then
        default_path="$HOME/Downloads/$default_subdir"
    fi

    read -p "$(echo -e ${CYAN}'📁 أدخل مسار الحفظ (Enter للافتراضي '${NC}${default_path}${CYAN}'): '${NC})" SAVE_PATH
    SAVE_PATH=${SAVE_PATH:-$default_path}
    SAVE_PATH="${SAVE_PATH/#\~/$HOME}"

    if [ ! -d "$SAVE_PATH" ]; then
        echo -e "${YELLOW}📁 المجلد غير موجود. جاري إنشاؤه...${NC}"
        mkdir -p "$SAVE_PATH" || {
            echo -e "${RED}❌ فشل إنشاء المجلد!${NC}"
            log_error "Failed to create directory: $SAVE_PATH"
            exit 1
        }
    fi
    echo -e "${GREEN}✅ سيتم الحفظ في: $SAVE_PATH${NC}"
    log_info "Save path: $SAVE_PATH"
}

# ============================================================
# 🆕 بناء أمر yt-dlp مع جودة الصوت + log
# ============================================================
build_ytdlp_command() {
    local output_template="$1"
    local extra_arg="$2"
    local extra_value="$3"

    YT_DLP_CMD=(yt-dlp
        --newline
        --progress
        --console-title
        --ignore-errors
        --no-abort-on-error
        --retries 10
        --fragment-retries 10
        --retry-sleep 5
        -o "$output_template"
    )

    # تجاوز قيود YouTube
    if [[ "$DETECTED_PLATFORM" == "YouTube" ]]; then
        YT_DLP_CMD+=(
            --extractor-args "youtube:player_client=default,web_safari,mweb"
            --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
        )
    fi

    if [ -n "$USE_COOKIES" ]; then
        YT_DLP_CMD+=(--cookies-from-browser "$COOKIES_BROWSER")
    fi

    if [ "$DOWNLOAD_TYPE" == "2" ]; then
        # 🆕 MP3 مع الجودة المختارة
        YT_DLP_CMD+=(
            -x
            --audio-format mp3
            --audio-quality "${AUDIO_QUALITY:-192}"
            --embed-thumbnail
            --add-metadata
        )
    else
        if [ "$FORMAT_CODE" == "best" ] || [ -z "$FORMAT_CODE" ]; then
            YT_DLP_CMD+=(-f "bestvideo+bestaudio/best" --merge-output-format mp4)
        elif [[ "$FORMAT_CODE" =~ ^[0-9]+$ ]] && [ "$FORMAT_CODE" -le 4320 ] && [ "$FORMAT_CODE" -ge 144 ]; then
            YT_DLP_CMD+=(-f "bestvideo[height<=${FORMAT_CODE}]+bestaudio/best[height<=${FORMAT_CODE}]" --merge-output-format mp4)
        else
            YT_DLP_CMD+=(-f "${FORMAT_CODE}+bestaudio/${FORMAT_CODE}/best" --merge-output-format mp4)
        fi
    fi

    if [[ "$WANT_SUBS" =~ ^[Yy]$ ]] && [ -n "$SUB_LANG" ]; then
        YT_DLP_CMD+=(
            --write-subs
            --write-auto-subs
            --sub-langs "$SUB_LANG"
            --convert-subs srt
        )
    fi

    if [ -n "$extra_arg" ]; then
        YT_DLP_CMD+=("$extra_arg" "$extra_value")
    fi
}

# ============================================================
# 🆕 تنفيذ yt-dlp مع تسجيل كامل في الـ log
# ============================================================
run_ytdlp_with_logging() {
    local task_log="$LOGS_DIR/task_${SESSION_ID}_$(date +%H%M%S).log"

    log_info "Starting yt-dlp execution. Task log: $task_log"
    log_info "Command: ${YT_DLP_CMD[*]}"

    # نكتب الهيدر في ملف المهمة
    {
        echo "================================================================"
        echo "  Task Log - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "================================================================"
        echo "Platform : $DETECTED_PLATFORM"
        echo "Type     : $([ "$DOWNLOAD_TYPE" == "1" ] && echo "Video ($FORMAT_CODE)" || echo "Audio MP3 (${AUDIO_QUALITY:-192} kbps)")"
        echo "Subs     : ${SUB_LANG:-none}"
        echo "Save Path: $SAVE_PATH"
        echo "Cookies  : ${COOKIES_BROWSER:-none}"
        echo "================================================================"
        echo ""
        echo "Full command:"
        printf '  %s' "${YT_DLP_CMD[0]}"
        for arg in "${YT_DLP_CMD[@]:1}"; do
            printf ' \\\n    %q' "$arg"
        done
        echo ""
        echo ""
        echo "================================================================"
        echo "  Output:"
        echo "================================================================"
    } > "$task_log"

    # تنفيذ الأمر مع نسخ المخرجات للشاشة وللسجل
    "${YT_DLP_CMD[@]}" 2>&1 | tee -a "$task_log"
    local status=${PIPESTATUS[0]}

    {
        echo ""
        echo "================================================================"
        echo "  Exit Code: $status"
        echo "  Finished : $(date '+%Y-%m-%d %H:%M:%S')"
        echo "================================================================"
    } >> "$task_log"

    # نكتب رابط ملف المهمة في سجل الجلسة
    LAST_TASK_LOG="$task_log"
    log_info "Task finished with exit code: $status"

    return $status
}

# ============================================================
# محاولة الترجمة كرد على HTTP 429
# ============================================================
retry_subtitles_only() {
    local url="$1"
    local title="$2"
    local extra_arg="$3"
    local extra_value="$4"
    local is_playlist="$5"

    echo ""
    echo -e "${YELLOW}⏳ محاولة تحميل الترجمة بشكل منفصل...${NC}"
    log_warn "Retrying subtitles separately for: $title"
    sleep 3

    local sub_cmd=(yt-dlp
        --skip-download
        --write-subs
        --write-auto-subs
        --sub-langs "$SUB_LANG"
        --convert-subs srt
        --ignore-errors
        --no-abort-on-error
        --retries 5
        --retry-sleep 10
        -o "$SAVE_PATH/%(title)s.%(ext)s"
    )

    [ -n "$USE_COOKIES" ] && sub_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")

    if [ "$is_playlist" == "yes" ]; then
        sub_cmd+=(--yes-playlist)
    else
        sub_cmd+=(--no-playlist)
    fi

    [ -n "$extra_arg" ] && sub_cmd+=("$extra_arg" "$extra_value")
    sub_cmd+=("$url")

    "${sub_cmd[@]}" 2>&1 | tee -a "$LAST_TASK_LOG" | tail -20
    local sub_status=${PIPESTATUS[0]}

    if [ $sub_status -eq 0 ]; then
        echo -e "${GREEN}✅ تم تحميل الترجمة بنجاح!${NC}"
        log_success "Subtitles downloaded successfully on retry"
        return 0
    else
        echo -e "${YELLOW}⚠️  لم يتم تحميل الترجمة. الفيديو موجود لكن بدون ترجمة.${NC}"
        log_warn "Subtitles retry also failed"
        return 1
    fi
}

# ============================================================
# تحقق من نجاح التحميل
# ============================================================
check_download_success() {
    local count
    count=$(find "$SAVE_PATH" -type f \( -name "*.mp4" -o -name "*.mp3" -o -name "*.mkv" -o -name "*.webm" -o -name "*.m4a" -o -name "*.mov" \) -mmin -10 2>/dev/null | wc -l)
    echo "$count"
}

# ============================================================
# عرض النتيجة + الإشعار + إشارة لملف الـ log
# ============================================================
show_result() {
    local status=$1
    local title="$2"
    local mode="$3"

    local downloaded_count
    downloaded_count=$(check_download_success)

    echo ""
    print_separator

    if [ $status -eq 0 ] || [ "$downloaded_count" -gt 0 ]; then
        echo -e "${GREEN}${BOLD}"
        echo "╔══════════════════════════════════════════════════════════╗"
        echo "║   ✅  تم التحميل بنجاح! Download Completed Successfully  ║"
        echo "╚══════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "${CYAN}🌐 المنصة: ${BOLD}$DETECTED_PLATFORM${NC}"
        echo -e "${CYAN}📁 المسار: ${BOLD}$SAVE_PATH${NC}"
        [ -n "$title" ] && echo -e "${CYAN}🎬 ${BOLD}$title${NC}"
        echo -e "${CYAN}📊 ملفات جديدة: ${BOLD}$downloaded_count${NC}"
        echo -e "${CYAN}📝 السجل: ${BOLD}$LAST_TASK_LOG${NC}"

        if [ $status -ne 0 ]; then
            echo ""
            echo -e "${YELLOW}⚠️  حدثت بعض الأخطاء الجزئية (مثل فشل الترجمة)${NC}"
            echo -e "${YELLOW}   لكن الفيديو/الصوت تم تحميله. تفاصيل في الـ log${NC}"
        fi

        log_success "Download completed: $title (files: $downloaded_count)"

        local notif_msg="📁 $SAVE_PATH"
        [ -n "$title" ] && notif_msg="$title\n$notif_msg"

        if [ "$DOWNLOAD_TYPE" == "2" ]; then
            send_notification "✅ تم التحميل بنجاح" "🎵 $notif_msg" "audio-x-generic"
        else
            send_notification "✅ تم التحميل بنجاح" "🎬 $notif_msg" "video-x-generic"
        fi

        echo ""
        read -p "$(echo -e ${CYAN}'هل تريد فتح مجلد الحفظ الآن؟ (y/n): '${NC})" OPEN_FOLDER
        if [[ "$OPEN_FOLDER" =~ ^[Yy]$ ]]; then
            if command -v xdg-open &> /dev/null; then
                xdg-open "$SAVE_PATH" &>/dev/null &
            elif command -v open &> /dev/null; then
                open "$SAVE_PATH" &>/dev/null &
            elif command -v explorer.exe &> /dev/null; then
                explorer.exe "$(wslpath -w "$SAVE_PATH" 2>/dev/null || echo "$SAVE_PATH")" &>/dev/null &
            fi
        fi
        return 0
    else
        echo -e "${RED}${BOLD}"
        echo "╔══════════════════════════════════════════════════════════╗"
        echo "║         ❌  حدث خطأ أثناء التحميل! Download Failed       ║"
        echo "╚══════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "${YELLOW}📝 تفاصيل الخطأ في الـ log:${NC}"
        echo -e "   ${CYAN}$LAST_TASK_LOG${NC}"
        echo ""
        echo -e "${YELLOW}💡 نصائح:${NC}"
        echo -e "   • جرّب استخدام كوكيز المتصفح (الخيار 🍪)"
        echo -e "   • تأكد من تثبيت curl_cffi"
        echo -e "   • انتظر قليلاً ثم أعد المحاولة"
        echo -e "   • تحقق من الإنترنت أو فعّل VPN"
        log_error "Download failed for: $title (exit code: $status)"
        send_notification "❌ فشل التحميل" "تفاصيل: $LAST_TASK_LOG" "dialog-error"
        return 1
    fi
}

# ============================================================
# الوضع 1: فيديو واحد
# ============================================================
mode_single_video() {
    print_separator
    echo -e "${YELLOW}${BOLD}📌 وضع: تحميل فيديو واحد${NC}"
    print_separator

    log_info "=== Mode: Single Video ==="

    local VIDEO_URL=""
    while true; do
        read -p "$(echo -e ${CYAN}'🔗 الصق رابط الفيديو من أي منصة مدعومة: '${NC})" VIDEO_URL
        if [ -z "$VIDEO_URL" ]; then
            echo -e "${RED}❌ الرابط لا يمكن أن يكون فارغاً!${NC}"
            continue
        fi
        if validate_url "$VIDEO_URL"; then
            break
        else
            echo -e "${RED}❌ الرابط غير صحيح! يجب أن يبدأ بـ http:// أو https://${NC}"
        fi
    done

    log_info "URL: $VIDEO_URL"

    # 🆕 كشف المنصة
    local platform_label
    platform_label=$(detect_platform "$VIDEO_URL")
    echo -e "${GREEN}✅ المنصة المكتشفة: ${BOLD}$platform_label${NC}"
    log_info "Detected platform: $DETECTED_PLATFORM"

    ask_cookies_option

    echo ""
    echo -e "${BLUE}⏳ جاري جلب معلومات الفيديو...${NC}"
    local title_cmd=(yt-dlp --get-title --no-warnings --no-playlist)
    [ -n "$USE_COOKIES" ] && title_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
    title_cmd+=("$VIDEO_URL")

    local VIDEO_TITLE
    VIDEO_TITLE=$("${title_cmd[@]}" 2>/dev/null)
    if [ -z "$VIDEO_TITLE" ]; then
        echo -e "${RED}❌ تعذر جلب معلومات الفيديو.${NC}"
        echo -e "${YELLOW}💡 جرّب استخدام كوكيز المتصفح (خاصة لـ Instagram/Twitter)${NC}"
        log_error "Failed to get video title"
        return 1
    fi
    echo -e "${GREEN}✅ العنوان: ${BOLD}$VIDEO_TITLE${NC}"
    log_info "Title: $VIDEO_TITLE"

    choose_format_and_quality "$VIDEO_URL" "yes"
    choose_subtitles "$VIDEO_URL" "yes"

    # مجلد فرعي حسب المنصة
    choose_save_path "$DETECTED_PLATFORM"

    echo ""
    print_separator
    echo -e "${MAGENTA}${BOLD}🚀 بدء التحميل...${NC}"
    print_separator
    echo ""

    build_ytdlp_command "$SAVE_PATH/%(title)s.%(ext)s"
    YT_DLP_CMD+=(--no-playlist "$VIDEO_URL")

    run_ytdlp_with_logging
    local status=$?

    if [[ "$WANT_SUBS" =~ ^[Yy]$ ]] && grep -qi "HTTP Error 429\|Unable to download.*subtitles" "$LAST_TASK_LOG"; then
        echo ""
        echo -e "${YELLOW}⚠️  الترجمة فشلت بسبب HTTP 429${NC}"
        retry_subtitles_only "$VIDEO_URL" "$VIDEO_TITLE" "" "" "no"
    fi

    show_result $status "$VIDEO_TITLE" "single"
}

# ============================================================
# الوضع 2: قائمة تشغيل
# ============================================================
mode_playlist() {
    print_separator
    echo -e "${YELLOW}${BOLD}📌 وضع: تحميل قائمة تشغيل${NC}"
    print_separator

    log_info "=== Mode: Playlist ==="

    local PLAYLIST_URL=""
    while true; do
        read -p "$(echo -e ${CYAN}'🔗 رابط قائمة التشغيل (YouTube/Vimeo/SoundCloud...): '${NC})" PLAYLIST_URL
        if [ -z "$PLAYLIST_URL" ]; then
            echo -e "${RED}❌ الرابط لا يمكن أن يكون فارغاً!${NC}"
            continue
        fi
        if validate_url "$PLAYLIST_URL"; then
            if is_playlist_url "$PLAYLIST_URL"; then
                break
            else
                echo -e "${YELLOW}⚠️  الرابط لا يبدو كقائمة تشغيل${NC}"
                read -p "هل تريد المتابعة؟ (y/n): " cont
                [[ "$cont" =~ ^[Yy]$ ]] && break
            fi
        else
            echo -e "${RED}❌ الرابط غير صحيح!${NC}"
        fi
    done

    log_info "Playlist URL: $PLAYLIST_URL"

    local platform_label
    platform_label=$(detect_platform "$PLAYLIST_URL")
    echo -e "${GREEN}✅ المنصة: ${BOLD}$platform_label${NC}"
    log_info "Detected platform: $DETECTED_PLATFORM"

    ask_cookies_option

    echo ""
    echo -e "${BLUE}⏳ جاري جلب معلومات القائمة...${NC}"
    local pl_cmd=(yt-dlp --flat-playlist --print "%(playlist_title)s" --no-warnings)
    [ -n "$USE_COOKIES" ] && pl_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
    pl_cmd+=("$PLAYLIST_URL")
    local PLAYLIST_TITLE
    PLAYLIST_TITLE=$("${pl_cmd[@]}" 2>/dev/null | head -1)

    local count_cmd=(yt-dlp --flat-playlist --print "%(id)s" --no-warnings)
    [ -n "$USE_COOKIES" ] && count_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
    count_cmd+=("$PLAYLIST_URL")
    local VIDEO_COUNT
    VIDEO_COUNT=$("${count_cmd[@]}" 2>/dev/null | wc -l)

    [ -z "$PLAYLIST_TITLE" ] && PLAYLIST_TITLE="Playlist"
    echo -e "${GREEN}✅ القائمة: ${BOLD}$PLAYLIST_TITLE${NC}"
    echo -e "${GREEN}✅ عدد الفيديوهات: ${BOLD}$VIDEO_COUNT${NC}"
    log_info "Playlist: $PLAYLIST_TITLE ($VIDEO_COUNT videos)"

    echo ""
    print_separator
    echo -e "${YELLOW}${BOLD}📌 نطاق الفيديوهات${NC}"
    print_separator
    echo -e "${CYAN}  1) تحميل الكل${NC}"
    echo -e "${CYAN}  2) تحديد نطاق (من 1 إلى 5)${NC}"
    echo -e "${CYAN}  3) فيديوهات محددة (1,3,5,7)${NC}"
    echo ""

    local PLAYLIST_RANGE_ARG=""
    local PLAYLIST_RANGE_VAL=""
    while true; do
        read -p "$(echo -e ${CYAN}'اختر (1/2/3): '${NC})" range_choice
        case "$range_choice" in
            1) break ;;
            2)
                read -p "$(echo -e ${CYAN}'من رقم: '${NC})" start_n
                read -p "$(echo -e ${CYAN}'إلى رقم: '${NC})" end_n
                PLAYLIST_RANGE_ARG="--playlist-items"
                PLAYLIST_RANGE_VAL="${start_n}-${end_n}"
                break ;;
            3)
                read -p "$(echo -e ${CYAN}'الأرقام (1,3,5): '${NC})" items
                PLAYLIST_RANGE_ARG="--playlist-items"
                PLAYLIST_RANGE_VAL="$items"
                break ;;
            *) echo -e "${RED}❌ خيار غير صحيح${NC}" ;;
        esac
    done
    log_info "Playlist range: ${PLAYLIST_RANGE_VAL:-all}"

    choose_format_and_quality "" "no"
    choose_subtitles "" "no"

    local safe_name
    safe_name=$(echo "$PLAYLIST_TITLE" | tr -d '/\\:*?"<>|' | head -c 80)
    choose_save_path "${DETECTED_PLATFORM}/${safe_name}"

    echo ""
    print_separator
    echo -e "${MAGENTA}${BOLD}🚀 بدء تحميل القائمة...${NC}"
    print_separator
    echo ""

    build_ytdlp_command "$SAVE_PATH/%(playlist_index)03d - %(title)s.%(ext)s" "$PLAYLIST_RANGE_ARG" "$PLAYLIST_RANGE_VAL"
    YT_DLP_CMD+=(--yes-playlist "$PLAYLIST_URL")

    run_ytdlp_with_logging
    local status=$?

    if [[ "$WANT_SUBS" =~ ^[Yy]$ ]] && grep -qi "HTTP Error 429\|Unable to download.*subtitles" "$LAST_TASK_LOG"; then
        echo ""
        echo -e "${YELLOW}⚠️  بعض الترجمات فشلت بسبب HTTP 429${NC}"
        retry_subtitles_only "$PLAYLIST_URL" "$PLAYLIST_TITLE" "$PLAYLIST_RANGE_ARG" "$PLAYLIST_RANGE_VAL" "yes"
    fi

    show_result $status "$PLAYLIST_TITLE ($VIDEO_COUNT فيديو)" "playlist"
}

# ============================================================
# الوضع 3: تحميل دفعي
# ============================================================
mode_batch_file() {
    print_separator
    echo -e "${YELLOW}${BOLD}📌 وضع: تحميل دفعي من ملف${NC}"
    print_separator

    log_info "=== Mode: Batch File ==="

    echo -e "${CYAN}📝 يمكن خلط روابط من منصات مختلفة في نفس الملف${NC}"
    echo -e "${CYAN}💡 الأسطر التي تبدأ بـ # تعتبر تعليقات${NC}"
    echo ""

    local LINKS_FILE=""
    while true; do
        read -p "$(echo -e ${CYAN}'📄 مسار ملف الروابط: '${NC})" LINKS_FILE
        LINKS_FILE="${LINKS_FILE/#\~/$HOME}"
        if [ -z "$LINKS_FILE" ]; then
            echo -e "${RED}❌ المسار فارغ!${NC}"
            continue
        fi
        if [ ! -f "$LINKS_FILE" ]; then
            echo -e "${RED}❌ الملف غير موجود: $LINKS_FILE${NC}"
            read -p "هل تريد إنشاء قالب جاهز؟ (y/n): " create_template
            if [[ "$create_template" =~ ^[Yy]$ ]]; then
                cat > "$LINKS_FILE" <<'EOF'
# ضع روابط من أي منصة مدعومة (YouTube, Vimeo, TikTok, Twitter, ...)
# رابط واحد في كل سطر، الأسطر التي تبدأ بـ # تعتبر تعليقات
# مثال:
# https://www.youtube.com/watch?v=dQw4w9WgXcQ
# https://vimeo.com/123456789
# https://www.tiktok.com/@user/video/1234567890
EOF
                echo -e "${GREEN}✅ تم إنشاء القالب: $LINKS_FILE${NC}"
                return 0
            fi
            continue
        fi
        break
    done
    log_info "Links file: $LINKS_FILE"

    local TEMP_LINKS
    TEMP_LINKS=$(mktemp)
    grep -v '^[[:space:]]*#' "$LINKS_FILE" | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*$//' > "$TEMP_LINKS"

    local LINK_COUNT
    LINK_COUNT=$(wc -l < "$TEMP_LINKS")

    if [ "$LINK_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ الملف لا يحتوي على روابط!${NC}"
        log_error "No valid links in file"
        rm -f "$TEMP_LINKS"
        return 1
    fi

    # 🆕 إحصائية المنصات
    echo ""
    echo -e "${CYAN}${BOLD}📊 توزيع الروابط حسب المنصة:${NC}"
    declare -A platform_count
    while IFS= read -r line; do
        if validate_url "$line"; then
            local plat
            plat=$(detect_platform "$line" | sed 's/^[^ ]* //')
            platform_count[$plat]=$((${platform_count[$plat]:-0} + 1))
        fi
    done < "$TEMP_LINKS"

    for plat in "${!platform_count[@]}"; do
        echo -e "   ${GREEN}• $plat: ${platform_count[$plat]}${NC}"
    done

    local INVALID_COUNT=0
    while IFS= read -r line; do
        if ! validate_url "$line"; then
            INVALID_COUNT=$((INVALID_COUNT + 1))
            echo -e "${YELLOW}⚠️  رابط غير صالح: $line${NC}"
        fi
    done < "$TEMP_LINKS"

    echo ""
    echo -e "${GREEN}✅ إجمالي الروابط: ${BOLD}$LINK_COUNT${NC}"
    [ $INVALID_COUNT -gt 0 ] && echo -e "${YELLOW}⚠️  روابط غير صالحة: $INVALID_COUNT${NC}"
    log_info "Total links: $LINK_COUNT, Invalid: $INVALID_COUNT"

    echo ""
    read -p "$(echo -e ${CYAN}'هل تريد المتابعة؟ (y/n): '${NC})" confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        rm -f "$TEMP_LINKS"
        return 0
    fi

    # في الوضع الدفعي نعتبر المنصة "Mixed"
    DETECTED_PLATFORM="Mixed"

    ask_cookies_option
    choose_format_and_quality "" "no"
    choose_subtitles "" "no"
    choose_save_path "Batch_$(date +%Y%m%d_%H%M%S)"

    echo ""
    print_separator
    echo -e "${MAGENTA}${BOLD}🚀 بدء التحميل الدفعي...${NC}"
    print_separator
    echo ""

    build_ytdlp_command "$SAVE_PATH/%(extractor)s - %(title)s.%(ext)s" "-a" "$TEMP_LINKS"
    YT_DLP_CMD+=(--no-playlist)

    run_ytdlp_with_logging
    local status=$?

    if [[ "$WANT_SUBS" =~ ^[Yy]$ ]] && grep -qi "HTTP Error 429\|Unable to download.*subtitles" "$LAST_TASK_LOG"; then
        echo ""
        echo -e "${YELLOW}⚠️  بعض الترجمات فشلت بسبب HTTP 429${NC}"
        sleep 5
        local sub_cmd=(yt-dlp
            --skip-download
            --write-subs
            --write-auto-subs
            --sub-langs "$SUB_LANG"
            --convert-subs srt
            --ignore-errors
            --retries 5
            --retry-sleep 10
            --no-playlist
            -o "$SAVE_PATH/%(title)s.%(ext)s"
            -a "$TEMP_LINKS"
        )
        [ -n "$USE_COOKIES" ] && sub_cmd+=(--cookies-from-browser "$COOKIES_BROWSER")
        "${sub_cmd[@]}" 2>&1 | tee -a "$LAST_TASK_LOG" | tail -10
    fi

    rm -f "$TEMP_LINKS"
    show_result $status "$LINK_COUNT رابط" "batch"
}

# ============================================================
# 🆕 الوضع 4: إدارة السجلات
# ============================================================
mode_logs_manager() {
    print_separator
    echo -e "${YELLOW}${BOLD}📝 إدارة السجلات (Logs)${NC}"
    print_separator

    if [ ! -d "$LOGS_DIR" ] || [ -z "$(ls -A "$LOGS_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}لا توجد سجلات حالياً.${NC}"
        return 0
    fi

    echo -e "${CYAN}📁 مجلد السجلات: ${BOLD}$LOGS_DIR${NC}"
    echo ""

    local total_size
    total_size=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)
    local total_files
    total_files=$(find "$LOGS_DIR" -type f | wc -l)

    echo -e "${CYAN}📊 الإجمالي: ${BOLD}$total_files ملف ($total_size)${NC}"
    echo ""

    echo -e "${CYAN}  1) عرض قائمة السجلات${NC}"
    echo -e "${CYAN}  2) عرض آخر سجل${NC}"
    echo -e "${CYAN}  3) عرض سجل معين${NC}"
    echo -e "${CYAN}  4) فتح مجلد السجلات${NC}"
    echo -e "${CYAN}  5) حذف السجلات الأقدم من 7 أيام${NC}"
    echo -e "${CYAN}  6) حذف جميع السجلات${NC}"
    echo -e "${CYAN}  7) رجوع${NC}"
    echo ""

    read -p "$(echo -e ${CYAN}'اختر (1-7): '${NC})" log_choice
    case "$log_choice" in
        1)
            echo ""
            echo -e "${CYAN}${BOLD}📋 قائمة السجلات (الأحدث أولاً):${NC}"
            ls -lhrt "$LOGS_DIR" | tail -30
            ;;
        2)
            local latest_log
            latest_log=$(ls -t "$LOGS_DIR"/*.log 2>/dev/null | head -1)
            if [ -n "$latest_log" ]; then
                echo ""
                echo -e "${CYAN}${BOLD}📄 آخر سجل: $latest_log${NC}"
                print_separator
                less "$latest_log"
            fi
            ;;
        3)
            echo ""
            ls -lhrt "$LOGS_DIR" | tail -20
            echo ""
            read -p "$(echo -e ${CYAN}'اسم الملف: '${NC})" log_name
            if [ -f "$LOGS_DIR/$log_name" ]; then
                less "$LOGS_DIR/$log_name"
            else
                echo -e "${RED}❌ غير موجود!${NC}"
            fi
            ;;
        4)
            if command -v xdg-open &> /dev/null; then
                xdg-open "$LOGS_DIR" &>/dev/null &
            elif command -v open &> /dev/null; then
                open "$LOGS_DIR" &>/dev/null &
            elif command -v explorer.exe &> /dev/null; then
                explorer.exe "$(wslpath -w "$LOGS_DIR" 2>/dev/null || echo "$LOGS_DIR")" &>/dev/null &
            fi
            echo -e "${GREEN}✅ تم فتح المجلد${NC}"
            ;;
        5)
            local deleted
            deleted=$(find "$LOGS_DIR" -type f -mtime +7 -print | wc -l)
            find "$LOGS_DIR" -type f -mtime +7 -delete
            echo -e "${GREEN}✅ تم حذف $deleted ملف${NC}"
            ;;
        6)
            read -p "$(echo -e ${RED}'⚠️  متأكد من حذف الكل؟ (yes/no): '${NC})" confirm_del
            if [ "$confirm_del" == "yes" ]; then
                rm -rf "$LOGS_DIR"/*
                echo -e "${GREEN}✅ تم حذف جميع السجلات${NC}"
                # نعيد إنشاء سجل الجلسة الحالية
                init_logging
            fi
            ;;
        7) return 0 ;;
        *) echo -e "${RED}❌ خيار غير صحيح${NC}" ;;
    esac
}

# ============================================================
# 🆕 عرض المنصات المدعومة
# ============================================================
show_supported_platforms() {
    print_separator
    echo -e "${YELLOW}${BOLD}🌐 المنصات المدعومة${NC}"
    print_separator
    echo ""
    echo -e "${GREEN}${BOLD}المنصات الرئيسية:${NC}"
    echo -e "  📺 YouTube       (videos, playlists, shorts, live)"
    echo -e "  🎞️  Vimeo         (videos, channels, albums)"
    echo -e "  🎵 TikTok        (videos)"
    echo -e "  🐦 Twitter / X    (videos, threads)"
    echo -e "  📸 Instagram     (posts, reels, stories - مع كوكيز)"
    echo -e "  👥 Facebook      (videos - مع كوكيز)"
    echo -e "  🎥 Dailymotion   (videos, playlists)"
    echo -e "  🟣 Twitch        (clips, VODs, streams)"
    echo -e "  🔶 Reddit        (videos)"
    echo -e "  🔊 SoundCloud    (tracks, playlists)"
    echo -e "  📡 Bilibili      (videos)"
    echo ""
    echo -e "${CYAN}+ أكثر من 1800 موقع آخر مدعوم بواسطة yt-dlp${NC}"
    echo -e "${CYAN}راجع: ${BOLD}https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md${NC}"
    echo ""
    read -p "اضغط Enter للمتابعة..."
}

# ============================================================
# القائمة الرئيسية
# ============================================================
main_menu() {
    print_separator
    echo -e "${YELLOW}${BOLD}📌 القائمة الرئيسية${NC}"
    print_separator
    echo -e "${CYAN}  1) 🎬 تحميل فيديو واحد${NC}"
    echo -e "${CYAN}  2) 📜 تحميل قائمة تشغيل (Playlist)${NC}"
    echo -e "${CYAN}  3) 🔢 تحميل دفعي من ملف${NC}"
    echo -e "${CYAN}  4) 📝 إدارة السجلات (Logs)${NC}"
    echo -e "${CYAN}  5) 🌐 عرض المنصات المدعومة${NC}"
    echo -e "${CYAN}  6) ❌ خروج${NC}"
    echo ""

    while true; do
        read -p "$(echo -e ${CYAN}'اختر (1-6): '${NC})" mode_choice
        case "$mode_choice" in
            1) mode_single_video; break ;;
            2) mode_playlist; break ;;
            3) mode_batch_file; break ;;
            4) mode_logs_manager; break ;;
            5) show_supported_platforms; break ;;
            6)
                echo -e "${MAGENTA}إلى اللقاء! 👋${NC}"
                log_info "User exited the script"
                exit 0
                ;;
            *) echo -e "${RED}❌ خيار غير صحيح! اختر من 1 إلى 6${NC}" ;;
        esac
    done
}

# ============================================================
# نقطة البداية
# ============================================================
init_logging
print_header
echo -e "${GREEN}📝 سجل الجلسة: ${BOLD}$SESSION_LOG${NC}"
echo ""
check_requirements

while true; do
    main_menu
    echo ""
    print_separator
    read -p "$(echo -e ${CYAN}'هل تريد عملية أخرى؟ (y/n): '${NC})" again
    if [[ ! "$again" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${MAGENTA}${BOLD}شكراً لاستخدامك السكربت! 👋${NC}"
        echo -e "${CYAN}📝 جميع السجلات في: $LOGS_DIR${NC}"
        echo ""
        log_info "Session ended normally"
        break
    fi
    print_header
    echo -e "${GREEN}📝 سجل الجلسة: ${BOLD}$SESSION_LOG${NC}"
    echo ""
done
