export type Locale = 'ru' | 'en';

export type BandCopy = { low: string; in: string; high: string };

type Card = { title: string; text: string };

export type Dict = {
  metaTitle: string;
  metaDescription: string;
  brand: string;
  nav: { how: string; analyze: string; visit: string; about: string; faq: string };
  switchLabel: string;
  home: {
    kicker: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    proof: string[];
    sample: string;
    benefitsKicker: string;
    benefitsTitle: string;
    benefits: Card[];
    stepsKicker: string;
    stepsTitle: string;
    steps: Card[];
    anglesKicker: string;
    anglesTitle: string;
    anglesLead: string;
    anglesNote: string;
    faqKicker: string;
    faqTitle: string;
    faqAll: string;
    ctaTitle: string;
    ctaText: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  angles: Record<'knee' | 'back' | 'arm' | 'hip', { label: string; range: string; where: string }>;
  advice: Record<'knee' | 'back' | 'arm' | 'hip', BandCopy>;
  disclaimer: string;
  how: { title: string; lead: string; items: Card[] };
  analyze: {
    title: string;
    lead: string;
    bottom: string;
    top: string;
    topOptional: string;
    pick: string;
    replace: string;
    measure: string;
    measuring: string;
    loading: string;
    retake: string;
    crowd: string;
    noJoints: string;
    hipMissing: string;
    reset: string;
    toVisit: string;
    browser: string;
  };
  visit: {
    title: string;
    lead: string;
    name: string;
    phone: string;
    when: string;
    whenDay: string;
    whenTime: string;
    whenToday: string;
    whenTomorrow: string;
    whenPickDay: string;
    whenHint: string;
    comment: string;
    send: string;
    sending: string;
    sent: string;
    required: string;
    telegramDown: string;
    telegramMissing: string;
    addressFallback: string;
    paymentOn: string;
    paymentLink: string;
    paymentNoLink: string;
    broughtAngles: string;
  };
  about: { title: string; paragraphs: string[] };
  faq: { title: string; items: { q: string; a: string }[] };
  privacy: { title: string; paragraphs: string[] };
  footer: string;
};

export const dict: Record<Locale, Dict> = {
  ru: {
    metaTitle: 'BikeTrue — байкфит по фото',
    metaDescription: 'Посадка на велосипеде по двум фото сбоку. Колено, спина, руки, бедро — и запись на живую настройку.',
    brand: 'BikeTrue',
    nav: { how: 'Как снять', analyze: 'Разбор', visit: 'Записаться', about: 'Кто мы', faq: 'Вопросы' },
    switchLabel: 'EN',
    home: {
      kicker: 'Байкфит по фото',
      title: 'Посадка, в которой хочется ехать дальше',
      lead: 'Два фото сбоку — и видно, где велосипед спорит с тобой: колено, спина, руки, бедро. Остальное докрутим вживую.',
      primary: 'Разобрать фото',
      secondary: 'Как снять',
      proof: ['2 фото сбоку', '4 угла', 'Без регистрации'],
      sample: 'Пример разбора',
      benefitsKicker: 'Зачем',
      benefitsTitle: 'Хорошая посадка чувствуется сразу',
      benefits: [
        { title: 'Без боли', text: 'Колени, поясница, шея и кисти перестают напоминать о себе после каждой поездки.' },
        { title: 'Больше силы', text: 'Нога работает в полный ход — те же ватты даются легче.' },
        { title: 'Дальше и дольше', text: 'Когда удобно, маршрут сам становится длиннее.' },
      ],
      stepsKicker: 'Как это работает',
      stepsTitle: 'Три шага до понятной посадки',
      steps: [
        { title: 'Сними себя сбоку', text: 'Телефон на уровне седла, шатун внизу. Второй кадр с шатуном вверху — для бедра.' },
        { title: 'Посмотри углы', text: 'Скелет ляжет прямо на фото, рядом — что подкрутить: седло, вынос, руль.' },
        { title: 'Докрутим вживую', text: 'Если хочется точнее — записывайся. Посмотрим вместе, подстроим и проедем.' },
      ],
      anglesKicker: 'Что смотрим',
      anglesTitle: 'Четыре угла, которые рассказывают о посадке',
      anglesLead: 'Ориентиры для спокойной шоссейной и смешанной езды. Цель — комфорт, а не цифра.',
      anglesNote: 'Это не медицинская норма. Если боль не проходит — сначала к врачу.',
      faqKicker: 'Вопросы',
      faqTitle: 'Коротко о главном',
      faqAll: 'Все вопросы',
      ctaTitle: 'Докрутим вместе?',
      ctaText: 'Приходи на посадку: посмотрим, подстроим седло, руль и шипы — и проедем, пока не станет хорошо.',
      ctaPrimary: 'Записаться',
      ctaSecondary: 'Сначала фото',
    },
    angles: {
      knee: { label: 'Колено', range: '140–150°', where: 'шатун внизу' },
      back: { label: 'Спина', range: '35–50°', where: 'к горизонту' },
      arm: { label: 'Рука', range: '150–165°', where: 'локоть мягкий' },
      hip: { label: 'Бедро', range: '55–70°', where: 'шатун вверху' },
    },
    advice: {
      knee: {
        low: 'Седло, скорее всего, низковато. Подними небольшими шагами и пересними.',
        in: 'По колену всё в ориентире. Соседние углы и ощущения всё ещё важны.',
        high: 'Седло, скорее всего, высоковато, таз может качать. Опусти и пересними.',
      },
      back: {
        low: 'Посадка агрессивнее спокойной. Вынос и наклон руля лучше смотреть вживую.',
        in: 'Наклон спины в ориентире для смешанной езды.',
        high: 'Корпус слишком вертикальный для шоссе. Стоит посмотреть длину и перепад до руля.',
      },
      arm: {
        low: 'Рука слишком согнута, вес может сидеть впереди. Смотри длину выноса.',
        in: 'Рука чуть согнута — так и задумано.',
        high: 'Рука почти прямая. От этого устают шея и кисти. Смотри высоту руля.',
      },
      hip: {
        low: 'Корпус слишком закрыт к бедру — мешает дыханию. Седло вслепую не крути, лучше приходи.',
        in: 'Открытие бедра в ориентире.',
        high: 'Открытие большое. Часто это высоковатый руль или коротковатый вылет.',
      },
    },
    disclaimer: 'Онемение, травма и боль, которая не отпускает, — к врачу, а не к ещё одному обороту седла.',
    how: {
      title: 'Как снять',
      lead: 'Пять минут подготовки — и цифрам можно верить.',
      items: [
        { title: 'Вид справа', text: 'Камера смотрит на ведущую звезду, объектив на высоте седла, три метра до велика.' },
        { title: 'Весь силуэт', text: 'В кадре велик и человек целиком, с полями по краям. Одежда облегающая.' },
        { title: 'Ровный свет', text: 'Без окна за спиной и без жёсткой тени поперёк колена.' },
        { title: 'Шатун внизу', text: 'Строго на 6 часов. Здесь видно колено, спину и руку.' },
        { title: 'Шатун вверху', text: 'Та же точка, шатун на 12 часов. Этот кадр нужен для бедра.' },
        { title: 'Один в кадре', text: 'Второй человек сбивает скелет. Помощника — за камеру.' },
      ],
    },
    analyze: {
      title: 'Разбор',
      lead: 'Загрузи фото сбоку — углы посчитаются прямо здесь, на твоём устройстве.',
      bottom: 'Кадр A · шатун внизу',
      top: 'Кадр B · шатун вверху',
      topOptional: 'Можно пропустить — тогда без бедра.',
      pick: 'Выбрать фото',
      replace: 'Другое фото',
      measure: 'Посчитать',
      measuring: 'Считаю…',
      loading: 'Готовлю модель позы…',
      retake: 'Не вижу суставы. Пересними сбоку при ровном свете.',
      crowd: 'В кадре больше одного человека. Оставь одного.',
      noJoints: 'Этого угла на кадре нет.',
      hipMissing: 'Нужен второй кадр, шатун вверху.',
      reset: 'Начать заново',
      toVisit: 'Записаться на посадку',
      browser: 'Этому экрану нужен свежий браузер.',
    },
    visit: {
      title: 'Запись на посадку',
      lead: 'Оставь контакты — напишем в Telegram и договоримся.',
      name: 'Имя',
      phone: 'Телефон',
      when: 'Когда удобно',
      whenDay: 'День',
      whenTime: 'Время',
      whenToday: 'Сегодня',
      whenTomorrow: 'Завтра',
      whenPickDay: 'Другой день',
      whenHint: 'Выбери день и час — или оставь пустым.',
      comment: 'Что беспокоит или чего хочется',
      send: 'Записаться',
      sending: 'Отправляю…',
      sent: 'Готово. Скоро напишем в Telegram.',
      required: 'Нужны имя и телефон.',
      telegramDown: 'Не получилось отправить. Попробуй ещё раз.',
      telegramMissing: 'Запись временно не работает. Попробуй чуть позже.',
      addressFallback: 'Адрес пришлём в Telegram.',
      paymentOn: 'Визит можно оплатить заранее.',
      paymentLink: 'Оплатить',
      paymentNoLink: 'Оплатить можно на месте.',
      broughtAngles: 'Углы из разбора приложатся к записи.',
    },
    about: {
      title: 'Кто мы',
      paragraphs: [
        'Мы просто любим кататься. У каждого своя жизнь и своя работа, а велосипед — то, что нас объединяет.',
        'Однажды разобрались, как посадка меняет езду: меньше боли, больше сил, длиннее маршрут. Теперь помогаем с этим другим — и сами продолжаем учиться.',
        'BikeTrue — наше хобби и интерес. Хотим, чтобы и ты гонял лучше, был здоровее и сильнее.',
      ],
    },
    faq: {
      title: 'Вопросы',
      items: [
        { q: 'Это заменяет фитера?', a: 'Нет. Это быстрый первый взгляд. Тонкие вещи — шипы, ширину седла, ощущения — докручиваем вживую.' },
        { q: 'Что нужно для фото?', a: 'Телефон, вид справа, ровный свет и шатун внизу. Станок помогает, но стена тоже подойдёт.' },
        { q: 'Куда девается снимок?', a: 'Никуда. Разбор идёт прямо в браузере, фото не покидает твоё устройство.' },
        { q: 'Зачем второй кадр?', a: 'Угол бедра виден, только когда нога вверху. По одному кадру его не посчитать честно.' },
      ],
    },
    privacy: {
      title: 'Приватность',
      paragraphs: [
        'Фото не покидает твоё устройство — разбор идёт прямо в браузере.',
        'Из записи мы получаем только то, что ты сам написал, и используем это, чтобы с тобой связаться.',
      ],
    },
    footer: 'BikeTrue — посадка, в которой хочется ехать.',
  },
  en: {
    metaTitle: 'BikeTrue — bike fit from a photo',
    metaDescription: 'Bike position from two side photos. Knee, back, arms, hip — then a hands-on fitting.',
    brand: 'BikeTrue',
    nav: { how: 'How to shoot', analyze: 'Analysis', visit: 'Book', about: 'About', faq: 'FAQ' },
    switchLabel: 'RU',
    home: {
      kicker: 'Bike fit from a photo',
      title: 'A position that makes you want to ride further',
      lead: 'Two side photos show where the bike is fighting you: knee, back, arms, hip. The rest we fine-tune in person.',
      primary: 'Analyze a photo',
      secondary: 'How to shoot',
      proof: ['2 side photos', '4 angles', 'No sign-up'],
      sample: 'Sample reading',
      benefitsKicker: 'Why',
      benefitsTitle: 'A good fit is felt right away',
      benefits: [
        { title: 'No pain', text: 'Knees, lower back, neck and hands stop complaining after every ride.' },
        { title: 'More power', text: 'The leg works through its full stroke — the same watts feel easier.' },
        { title: 'Further, longer', text: 'When it feels right, the route grows on its own.' },
      ],
      stepsKicker: 'How it works',
      stepsTitle: 'Three steps to a clear position',
      steps: [
        { title: 'Shoot from the side', text: 'Phone at saddle height, crank down. A second photo with the crank up — for the hip.' },
        { title: 'Read the angles', text: 'A skeleton lands on the photo, with what to adjust: saddle, stem, bars.' },
        { title: 'Fine-tune in person', text: 'Want it precise? Book a session. We look together, adjust, and ride.' },
      ],
      anglesKicker: 'What we look at',
      anglesTitle: 'Four angles that tell the story of your position',
      anglesLead: 'Guides for easy road and mixed riding. The goal is comfort, not a number.',
      anglesNote: 'Not a medical standard. If pain stays — see a doctor first.',
      faqKicker: 'Questions',
      faqTitle: 'The short version',
      faqAll: 'All questions',
      ctaTitle: 'Fine-tune it together?',
      ctaText: 'Come for a fitting: we look, adjust saddle, bars and cleats — and ride until it feels right.',
      ctaPrimary: 'Book',
      ctaSecondary: 'Photo first',
    },
    angles: {
      knee: { label: 'Knee', range: '140–150°', where: 'crank down' },
      back: { label: 'Back', range: '35–50°', where: 'from horizontal' },
      arm: { label: 'Arm', range: '150–165°', where: 'soft elbow' },
      hip: { label: 'Hip', range: '55–70°', where: 'crank up' },
    },
    advice: {
      knee: {
        low: 'The saddle is probably low. Raise it in small steps and shoot again.',
        in: 'The knee is within the guide. The other angles and how you feel still matter.',
        high: 'The saddle is probably high and the pelvis may rock. Lower it and shoot again.',
      },
      back: {
        low: 'More aggressive than an easy position. Stem and bar tilt are best checked in person.',
        in: 'Back angle is within the mixed-riding guide.',
        high: 'The torso is very upright for a road bike. Worth checking reach and drop.',
      },
      arm: {
        low: 'The arm is quite bent, so weight may sit forward. Look at stem length.',
        in: 'A slightly bent arm is the idea.',
        high: 'The arm is almost straight. Neck and hands pay for that. Look at bar height.',
      },
      hip: {
        low: 'The torso is closed hard onto the thigh — it gets in the way of breathing. Don’t guess the saddle, come by.',
        in: 'Hip opening is within the guide.',
        high: 'The hip is very open. Often the bar is high or the reach is short.',
      },
    },
    disclaimer: 'Numbness, an injury, or pain that won’t leave is for a doctor, not another turn of the saddle.',
    how: {
      title: 'How to shoot',
      lead: 'Five minutes of setup — and the numbers can be trusted.',
      items: [
        { title: 'Right side', text: 'The camera sees the chainring, lens at saddle height, about three metres away.' },
        { title: 'Whole silhouette', text: 'Bike and rider fully in frame, with margin. Close-fitting clothes.' },
        { title: 'Even light', text: 'No window behind you and no hard shadow across the knee.' },
        { title: 'Crank down', text: 'Straight to 6 o’clock. This shows knee, back and arm.' },
        { title: 'Crank up', text: 'Same spot, crank at 12 o’clock. This frame is for the hip.' },
        { title: 'One in frame', text: 'A second person confuses the skeleton. Helper goes behind the camera.' },
      ],
    },
    analyze: {
      title: 'Analysis',
      lead: 'Upload a side photo — the angles are computed right here, on your device.',
      bottom: 'Frame A · crank down',
      top: 'Frame B · crank up',
      topOptional: 'You can skip it — then no hip.',
      pick: 'Choose a photo',
      replace: 'Another photo',
      measure: 'Measure',
      measuring: 'Measuring…',
      loading: 'Loading the pose model…',
      retake: 'I can’t see the joints. Shoot again from the side in even light.',
      crowd: 'More than one person is in frame. Leave one.',
      noJoints: 'This angle is not on the frame.',
      hipMissing: 'A second frame is needed, crank at the top.',
      reset: 'Start over',
      toVisit: 'Book a fitting',
      browser: 'This screen needs a recent browser.',
    },
    visit: {
      title: 'Book a fitting',
      lead: 'Leave your contacts — we’ll write on Telegram and find a time.',
      name: 'Name',
      phone: 'Phone',
      when: 'A good time',
      whenDay: 'Day',
      whenTime: 'Time',
      whenToday: 'Today',
      whenTomorrow: 'Tomorrow',
      whenPickDay: 'Another day',
      whenHint: 'Pick a day and hour — or leave it blank.',
      comment: 'What bothers you, or what you want',
      send: 'Book',
      sending: 'Sending…',
      sent: 'Done. We’ll write on Telegram soon.',
      required: 'Name and phone are required.',
      telegramDown: 'Couldn’t send it. Please try again.',
      telegramMissing: 'Booking is temporarily down. Try again a bit later.',
      addressFallback: 'We’ll send the address on Telegram.',
      paymentOn: 'The visit can be paid ahead.',
      paymentLink: 'Pay',
      paymentNoLink: 'You can pay on the spot.',
      broughtAngles: 'Angles from your analysis will come along.',
    },
    about: {
      title: 'About',
      paragraphs: [
        'We just love to ride. Each of us has our own life and work — the bike is what brings us together.',
        'At some point we figured out how much position changes riding: less pain, more power, longer routes. Now we help others with it — and keep learning ourselves.',
        'BikeTrue is our hobby and our interest. We want you to ride better, stay healthier and get stronger.',
      ],
    },
    faq: {
      title: 'Questions',
      items: [
        { q: 'Does this replace a fitter?', a: 'No. It’s a quick first look. The finer things — cleats, saddle width, how it feels — we tune in person.' },
        { q: 'What do I need for the photo?', a: 'A phone, a right-side view, even light, and the crank down. A trainer helps, but a wall works too.' },
        { q: 'Where does the picture go?', a: 'Nowhere. The analysis runs in your browser; the photo never leaves your device.' },
        { q: 'Why a second photo?', a: 'The hip angle only shows when the leg is up. One frame can’t measure it honestly.' },
      ],
    },
    privacy: {
      title: 'Privacy',
      paragraphs: [
        'The photo never leaves your device — the analysis runs in your browser.',
        'From a booking we only get what you write yourself, and use it to get in touch.',
      ],
    },
    footer: 'BikeTrue — a position you want to keep riding.',
  },
};
