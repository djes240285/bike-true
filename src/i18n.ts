export type Locale = 'ru' | 'en';

export type BandCopy = { low: string; in: string; high: string };

type Card = { title: string; text: string };

export type Dict = {
  metaTitle: string;
  metaDescription: string;
  brand: string;
  nav: { how: string; analyze: string; visit: string; about: string; faq: string; account: string };
  switchLabel: string;
  home: {
    kicker: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    proof: string[];
    sample: string;
    samplePoses: string[];
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
    supportTitle: string;
    supportText: string;
    supportCustom: string;
    supportButton: string;
    supportPending: string;
  };
  angles: Record<'knee' | 'back' | 'arm' | 'hip', { label: string; range: string; where: string }>;
  advice: Record<'knee' | 'back' | 'arm' | 'hip', BandCopy>;
  disclaimer: string;
  how: {
    title: string;
    lead: string;
    film: string;
    meters: string;
    camera: { title: string; text: string };
    frame: { title: string; checks: { title: string; text: string }[] };
    shots: {
      title: string;
      down: { title: string; text: string };
      up: { title: string; text: string };
    };
    next: string;
  };
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
    kept: string;
    toVisit: string;
    browser: string;
    bottomHint: string;
    upload: string;
    dropHere: string;
    example: string;
    measures: string;
    notVisible: string;
    ghostNow: string;
    ghostTarget: string;
    ghostLegend: string;
    ghostAllIn: string;
    saveImage: string;
    saveVideo: string;
    recording: string;
    photos: string;
    videoTitle: string;
    videoHint: string;
    videoUpload: string;
    videoReplace: string;
    videoDrop: string;
    videoWorking: string;
    videoLong: string;
    videoMinute: string;
    fitLead: string;
    fitBikeOn: string;
    fitBikeOff: string;
    videoFloat: string;
    bikeUse: string;
    bikeSkip: string;
    bodyTitle: string;
    bodyHint: string;
    gradeOn: string;
    gradeHold: string;
    gradeShift: string;
    addBike: string;
    bikeDialog: string;
    bikeDialogLead: string;
    bikeName: string;
    bikeCrank: string;
    bikeStem: string;
    bikeSave: string;
    bikeClose: string;
    bikeNeedSignIn: string;
    signInBack: string;
    bikeError: string;
    bikeLimit: string;
    subNote: string;
    overheadTitle: string;
    overheadHint: string;
    overheadFront: string;
    overheadSide: string;
    overheadUpload: string;
    overheadWorking: string;
    overheadKneesIn: string;
    overheadKneesOver: string;
    overheadKneesOut: string;
    overheadTorsoForward: string;
    overheadTorsoWith: string;
    overheadTorsoUpright: string;
    overheadUnseen: string;
    overheadCompare: string;
    overheadHelpTitle: string;
    overheadHelp: string;
    overheadSteps: string[];
    overheadPhotos: string;
    overheadClip: string;
    overheadFrontPhoto: string;
    overheadSidePhoto: string;
    overheadMany: string;
    overheadRun: string;
    overheadAdd: string;
    overheadKnee: string;
    overheadHip: string;
    overheadTorso: string;
    overheadShin: string;
    overheadArm: string;
    overheadNeck: string;
    overheadLeft: string;
    overheadRight: string;
    overheadSplit: string;
    overheadBriefTitle: string;
    overheadNotRide: string;
    overheadNeckNote: string;
    overheadSeat: string;
    overheadStay: string;
    overheadFlagKneesIn: string;
    overheadFlagKneesOver: string;
    overheadFlagKneesOut: string;
    overheadFlagShin: string;
    overheadFlagNeck: string;
    overheadFlagArmsOpen: string;
    overheadFlagArmsShort: string;
    overheadFlagHip: string;
    stackTitle: string;
    stackCamera: string;
    stackBike: string;
    stackSaddle: string;
    stackAgree: string;
    stackSplit: string;
    stackPhoto: string;
    stackFilm: string;
    stackNamed: string;
    stackOpen: string;
    saveScope: string;
    factorTitle: string;
    factorLead: string;
    factorBike: string;
    factorBody: string;
    factorCrank: string;
    factorStem: string;
    factorDrop: string;
    factorSaddle: string;
    factorMissing: string;
    factorQuiet: string;
    factorQuietEmpty: string;
    factorSpeaks: string;
    factorSaddleLine: string;
    factorSaddleMissing: string;
    factorHold: string;
    factorShifts: string;
    factorBodySpeaks: string;
    factorBodyMissing: string;
    gradeEasy: string;
    gradeReach: string;
    gradeEffort: string;
    gradeCant: string;
    bodyPosterior: string;
    bodyHip: string;
    bodyAnkle: string;
    bodyShoulder: string;
    notes: {
      kneeCrank: string;
      armStemLong: string;
      armStemShort: string;
      backPosterior: string;
      hipFlex: string;
      kneeAnkle: string;
      armShoulder: string;
      backDropFlat: string;
      backDropUp: string;
    };
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
  account: {
    title: string;
    leadOut: string;
    leadIn: string;
    signin: string;
    signinLead: string;
    google: string;
    yandex: string;
    telegram: string;
    telegramLocal: string;
    connect: string;
    logout: string;
    delete: string;
    deleteConfirm: string;
    name: string;
    save: string;
    saved: string;
    unavailable: string;
    body: string;
    bikes: string;
    readings: string;
    rider: string;
    riderLook: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    cabinetLoading: string;
    child: string;
    teen: string;
    adult: string;
    height: string;
    inseam: string;
    inseamHelp: string;
    bikeName: string;
    fit: string;
    city: string;
    endurance: string;
    race: string;
    mtb: string;
    crank: string;
    saddle: string;
    stem: string;
    drop: string;
    measureHint: string;
    mmRange: Record<'crank' | 'saddle' | 'stem' | 'drop', string>;
    mmCm: string;
    measures: {
      crank: { title: string; text: string; steps: string[] };
      saddle: { title: string; text: string; steps: string[] };
      stem: { title: string; text: string; steps: string[] };
      drop: { title: string; text: string; steps: string[] };
    };
    bikeNote: string;
    addBike: string;
    noBike: string;
    empty: string;
    readingBack: string;
    readingToday: string;
    readingNone: string;
    readingMissing: string;
    remove: string;
    studioTitle: string;
    studioDenied: string;
    toAccount: string;
    saveReading: string;
    pickBike: string;
    error: string;
    limit: string;
    taken: string;
    noEmail: string;
  };
  pwa: {
    notice: string;
    noticeOk: string;
    install: string;
    installAndroid: string;
    installIos: string;
    later: string;
    update: string;
    updateGo: string;
  };
  footer: string;
};

export const dict: Record<Locale, Dict> = {
  ru: {
    metaTitle: 'BikeTrue — байкфит по фото',
    metaDescription: 'Посадка на велосипеде по двум фото сбоку. Колено, спина, руки, бедро — и запись на живую настройку.',
    brand: 'BikeTrue',
    nav: { how: 'Как снять', analyze: 'Разбор', visit: 'Консультация', about: 'Кто мы', faq: 'Вопросы', account: 'Кабинет' },
    switchLabel: 'EN',
    home: {
      kicker: 'Байкфит по фото',
      title: 'Посадка, в которой хочется ехать дальше',
      lead: 'Два фото сбоку — и видно, где велосипед спорит с тобой: колено, спина, руки, бедро. Остальное докрутим вживую.',
      primary: 'Разобрать фото',
      secondary: 'Как снять',
      proof: ['2 фото сбоку', '4 угла', 'Можно без входа'],
      sample: 'Пример разбора',
      samplePoses: ['В коридоре', 'Седло высоко', 'Седло низко', 'Далеко до руля', 'Слишком прямо'],
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
      ctaPrimary: 'Написать в Telegram',
      ctaSecondary: 'Сначала фото',
      supportTitle: 'Поддержите BikeTrue',
      supportText: 'Разбор кадра бесплатный. Поддержка помогает держать его открытым.',
      supportCustom: 'Другая сумма',
      supportButton: 'Поддержать {amount} ₽',
      supportPending: 'Ссылка на оплату ещё не подключена.',
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
      film: 'Человек наводит телефон на штативе на велосипед сбоку. На экране виден весь велик.',
      meters: '3 м',
      camera: {
        title: 'Вид справа',
        text: 'Камера смотрит на ведущую звезду, объектив на высоте седла, три метра до велика.',
      },
      frame: {
        title: 'Проверь кадр',
        checks: [
          { title: 'Весь силуэт', text: 'Велик и человек целиком, одежда облегающая.' },
          { title: 'Ровный свет', text: 'Без окна за спиной и без тени поперёк колена.' },
          { title: 'Один в кадре', text: 'Второй человек сбивает разбор. Помощник — за камеру.' },
        ],
      },
      shots: {
        title: 'Два кадра',
        down: { title: 'Шатун внизу', text: 'Педаль на 6 часов, нога почти прямая. Отсюда колено, спина и рука.' },
        up: { title: 'Шатун вверху', text: 'Та же точка, педаль на 12 часов, стопа на педали. Этот кадр — для бедра.' },
      },
      next: 'Дальше — разобрать кадр',
    },
    analyze: {
      title: 'Разбор',
      lead: 'Загрузи фото или короткий ролик сбоку. Углы считаются здесь, файл с устройства не уходит.',
      bottom: 'Педаль внизу',
      top: 'Педаль вверху',
      bottomHint: 'Педаль со стороны камеры — на 6 часов, нога почти прямая.',
      topOptional: 'Та же точка, педаль на 12 часов. Можно пропустить — тогда без бедра.',
      upload: 'Загрузить фото',
      dropHere: 'или перетащи сюда',
      example: 'Пример',
      measures: 'Посчитаем',
      notVisible: 'не видно на кадре',
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
      kept: 'Углы прошлого разбора на этом устройстве. Фото вернётся само, если оно ещё здесь.',
      toVisit: 'Написать в Telegram',
      browser: 'Этому экрану нужен свежий браузер.',
      ghostNow: 'Сейчас',
      ghostTarget: 'Ориентир',
      ghostLegend: 'Оранжевый — как ты сидишь сейчас. Белый пунктир — куда тянуться.',
      ghostAllIn: 'Все углы в ориентире — двигать нечего.',
      saveImage: 'Сохранить картинку',
      saveVideo: 'Сохранить видео',
      recording: 'Записываю…',
      photos: 'Два фото той же посадки',
      videoTitle: 'Ролик сбоку',
      videoHint: 'До минуты на станке, несколько оборотов. Рычаги рисуются здесь. На сервер ролик не уходит.',
      videoUpload: 'Загрузить ролик',
      videoReplace: 'Другой ролик',
      videoDrop: 'или перетащи сюда',
      videoWorking: 'Считаю кадры на этом устройстве',
      videoLong: 'Длиннее минуты: беру первую минуту.',
      videoMinute: 'Длиннее полуминуты: читаю до минуты, кадры чуть реже.',
      fitLead: 'Сначала посадка: ролик сбоку и два фото об одном и том же. Вывод общий, ниже. Оверхед после него — другая сводка, угол посадки она не переписывает.',
      fitBikeOn: 'В совете велосипед «{name}». Шатун, вынос и падение входят во фразу, только если угол уже вне коридора. Градус не меняется.',
      fitBikeOff: 'Велосипед ещё не выбран. Совет идёт по коридору, размеры не участвуют. Выберешь его внизу, у сохранения.',
      videoFloat: 'За оборот углы плавают больше чем на 4°. Посадку лучше смотреть вживую.',
      bikeUse: 'Велосипед из кабинета',
      bikeSkip: 'Без велосипеда',
      bodyTitle: 'Запас тела',
      bodyHint: 'Нажатие фиксируется. «Легко» и «дотягиваюсь» оставляют обычный коридор. «С усилием» и «не могу» сдвигают его. Градус с ролика не переписывается.',
      gradeOn: 'Выбрано',
      gradeHold: 'Коридор обычный.',
      gradeShift: 'Коридор сдвинут.',
      addBike: 'Добавить велосипед',
      bikeDialog: 'Новый велосипед',
      bikeDialogLead: 'Он останется в кабинете и сразу ляжет на этот разбор.',
      bikeName: 'Название',
      bikeCrank: 'Шатун, мм',
      bikeStem: 'Вынос, мм',
      bikeSave: 'Сохранить',
      bikeClose: 'Закрыть',
      bikeNeedSignIn: 'Чтобы сохранить велосипед, войди. Ролик дождётся на этом устройстве, и мы вернём тебя сюда.',
      signInBack: 'Войти и вернуться',
      bikeError: 'Не получилось сохранить. Проверь название и миллиметры.',
      bikeLimit: 'В кабинете уже максимум велосипедов.',
      subNote: 'Подписка: оверхед, запас тела и свой велосипед. Кассы нет, поэтому блок открыт.',
      overheadTitle: 'Оверхед',
      overheadHint: 'Присед с палкой, босиком. Можно несколько роликов. Читаю обе стороны, от голени до кисти и шеи. Это наблюдение, не диагноз.',
      overheadFront: 'Спереди',
      overheadSide: 'Сбоку',
      overheadUpload: 'Загрузить приседы',
      overheadWorking: 'Смотрю нижнюю точку',
      overheadKneesIn: 'В нижней точке колени уже щиколоток. Часто так ведёт стопа или бедро.',
      overheadKneesOver: 'В нижней точке колени примерно над щиколотками.',
      overheadKneesOut: 'В нижней точке колени шире щиколоток.',
      overheadTorsoForward: 'Корпус ушёл вперёд относительно голени.',
      overheadTorsoWith: 'Наклон корпуса близок к голени.',
      overheadTorsoUpright: 'Корпус вертикальнее голени.',
      overheadUnseen: 'В нижней точке суставы не собрались. Нужен человек целиком, присед до конца.',
      overheadCompare: 'Сравниваю колени со щиколотками, не с носками: носки на ролике не меряю.',
      overheadHelpTitle: 'Что такое оверхед',
      overheadHelp: 'Присед с палкой над головой показывает, где тело не дотягивает: стопа, бедро, грудной отдел или плечо. Это не диагноз. Сзади не снимаем: суставы закрыты.',
      overheadSteps: [
        'Босиком, палка или ручка швабры над головой, локти прямые.',
        'Спереди: телефон на уровне пояса, видны стопы и палка.',
        'Сбоку: весь человек в кадре, присед до самой низкой точки.',
        'Ролик до минуты или два фото: одно спереди, одно сбоку, в нижней точке.',
      ],
      overheadPhotos: 'Два фото',
      overheadClip: 'Ролик',
      overheadFrontPhoto: 'Фото спереди',
      overheadSidePhoto: 'Фото сбоку',
      overheadMany: 'Отметь, откуда снят каждый присед. Углы не усредняю.',
      overheadRun: 'Разобрать',
      overheadAdd: 'Добавить ролики',
      overheadKnee: 'Колено',
      overheadHip: 'Бедро',
      overheadTorso: 'Корпус',
      overheadShin: 'Голень',
      overheadArm: 'Рука',
      overheadNeck: 'Шея',
      overheadLeft: 'Слева',
      overheadRight: 'Справа',
      overheadSplit: 'Колено в нижней точке {a}° и {b}°. Среднее не беру.',
      overheadBriefTitle: 'Что это значит для посадки',
      overheadNotRide: 'Это присед, не угол на велосипеде. Градус посадки он не заменяет.',
      overheadNeckNote: 'Шея — два отрезка, не один. Слева ухо–плечо–таз и справа то же самое. Так видно, какая сторона короче. Один общий угол это спрятал бы.',
      overheadSeat: 'На посадке колено {n}°. Присед это число не меняет.',
      overheadStay: 'В кабинет это ляжет в карточку человека, не в велосипед. Кнопка сохранения внизу.',
      overheadFlagKneesIn: 'Колени уже щиколоток. На велосипеде такое колено часто смотрит в раму. Сначала стойка и голеностоп, не высота седла.',
      overheadFlagKneesOver: 'Колени примерно над щиколотками. На угол посадки это само по себе не переносится.',
      overheadFlagKneesOut: 'Колени шире щиколоток. На велосипеде колено может открываться наружу. Стойку смотрят раньше седла.',
      overheadFlagShin: 'Голени разошлись больше чем на 8°. На велосипеде одна нога может вести колено иначе.',
      overheadFlagNeck: 'Шея слева и справа разошлась больше чем на 8°. На велосипеде одно плечо часто оказывается ниже.',
      overheadFlagArmsOpen: 'Руки над головой почти прямые. Плечо в этом тесте дотягивается, длина выноса тут ни при чём.',
      overheadFlagArmsShort: 'Рука над головой сгибается. Дотянуться до руля может мешать плечо, не только длина выноса.',
      overheadFlagHip: 'Бёдра в нижней точке почти прямые — присед не дошёл. Вывод по глубине пока слабый.',
      stackTitle: 'Как складывается разбор',
      stackCamera: 'Градус берётся с камеры и не переписывается. Тело сдвигает коридор. Велосипед меняет фразу совета, только когда угол уже вышел из коридора.',
      stackBike: 'Шатун объясняет слишком прямое колено, вынос — руку, падение руля — наклон корпуса. Высоту седла в градус не переводим: её проверяет колено.',
      stackSaddle: 'Высота седла {mm} мм записана. В угол она не пересчитывается.',
      stackAgree: '{label}: фото {a}° и ролик {b}° сходятся.',
      stackSplit: '{label}: фото {a}°, ролик {b}°. Разница больше 8°. Цифры так не складываются — лучше переснять кадр, где человек виден хуже.',
      stackPhoto: 'Фото',
      stackFilm: 'Ролик',
      stackNamed: 'Фразы считаются с «{name}». Размеры входят, только если угол уже вне коридора.',
      stackOpen: 'Велосипед не выбран. Размеры в этих фразах не участвуют.',
      saveScope: 'Четыре угла — в выбранный велосипед. Оверхед и запас тела — в карточку человека: они одни на все велосипеды. Пустой блок старую карточку не стирает.',
      factorTitle: 'Что вошло в расчёт',
      factorLead: 'Градус с камеры не меняется. Размер велосипеда меняет фразу, только если угол уже вне коридора. «С усилием» и «не могу» двигают сам коридор. «Легко» и «дотягиваюсь» его не трогают.',
      factorBike: 'Велосипед',
      factorBody: 'Запас тела',
      factorCrank: 'Шатун',
      factorStem: 'Вынос',
      factorDrop: 'Падение руля',
      factorSaddle: 'Седло',
      factorMissing: '{label} не записан. В расчёт не входит.',
      factorQuiet: '{label} {mm} мм. {angle} {value}° в коридоре {min}–{max}°. Размер молчит.',
      factorQuietEmpty: '{label} {mm} мм записан. Угла ещё нет, размер молчит.',
      factorSpeaks: '{label} {mm} мм. {angle} {value}° вне коридора {min}–{max}°. Размер входит во фразу. Градус остаётся {value}°.',
      factorSaddleLine: 'Седло {mm} мм. В градус не переводится. Высоту проверяет колено.',
      factorSaddleMissing: 'Седло не записано. В градус оно всё равно не переводится.',
      factorHold: '{label}: {grade}. Коридор «{angle}» остаётся {min}–{max}°.',
      factorShifts: '{label}: {grade}. Коридор «{angle}» становится {min}–{max}° вместо {baseMin}–{baseMax}°.',
      factorBodySpeaks: '{label}: {grade}. Коридор «{angle}» {min}–{max}°, угол {value}° в него упирается. Фраза про запас тела. Градус остаётся {value}°.',
      factorBodyMissing: '{label} не отмечен. Коридор «{angle}» обычный: {min}–{max}°.',
      gradeEasy: 'Легко',
      gradeReach: 'Дотягиваюсь',
      gradeEffort: 'С усилием',
      gradeCant: 'Не могу',
      bodyPosterior: 'Ладони к полу стоя',
      bodyHip: 'Колено к груди лёжа',
      bodyAnkle: 'Колено к стене, пятка на полу',
      bodyShoulder: 'Руки вверх у стены',
      notes: {
        kneeCrank: 'Шатун {mm} мм. Прямое колено внизу может быть из-за длины шатуна, не только из-за высоты седла.',
        armStemLong: 'Вынос {mm} мм. Прямая рука чаще от длинного выноса.',
        armStemShort: 'Вынос {mm} мм. Короткий вынос сгибает руку, вес может сидеть впереди.',
        backPosterior: 'До пола тянуться трудно. Низкий корпус просит заднюю цепь. Угол спины ниже не ведём.',
        hipFlex: 'Бедро к груди идёт с трудом. В верхней точке педали угол не закрываем.',
        kneeAnkle: 'Лодыжка не дотягивается. Колено внизу дальше не распрямляем.',
        armShoulder: 'Руки вверх идут с трудом. Прямую руку не требуем.',
        backDropFlat: 'Падение руля {mm} мм. Низкий корпус может быть из-за этого перепада.',
        backDropUp: 'Падение руля {mm} мм. Руль почти не ниже седла, поэтому корпус остаётся вертикальным.',
      },
    },
    visit: {
      title: 'Консультация',
      lead: 'Напиши, что хочется разобрать. Сообщение уходит в Telegram. День можно не выбирать.',
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
      send: 'Написать в Telegram',
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
        { q: 'Куда девается снимок?', a: 'Никуда. Разбор идёт прямо в браузере, фото не покидает твоё устройство. Если сохранить разбор в кабинет, на сервер уходят только градусы, без снимка.' },
        { q: 'Зачем второй кадр?', a: 'Угол бедра виден, только когда нога вверху. По одному кадру его не посчитать честно.' },
      ],
    },
    privacy: {
      title: 'Приватность',
      paragraphs: [
        'Фото не покидает твоё устройство — разбор идёт прямо в браузере.',
        'Последние углы, фото разбора и черновик записи остаются на этом устройстве, чтобы не начинать заново. Стереть их можно в настройках браузера, в данных сайта.',
        'Если сайт закрыт паролем, браузер хранит техническую куки входа. Рекламных и аналитических куки нет.',
        'Из записи мы получаем только то, что ты сам написал, и используем это, чтобы с тобой связаться.',
        'При сохранении на сервер уходят имя, почта провайдера, мерки, размеры велосипеда и градусы. Фото остаётся на устройстве. Кука сессии стоит на хосте кабинета.',
      ],
    },
    account: {
      title: 'Кабинет',
      leadOut: 'Войди, чтобы сохранить мерки, велосипеды и разборы.',
      leadIn: 'Здесь мерки, велосипеды и сохранённые разборы.',
      signin: 'Войти',
      signinLead: 'Google, Яндекс или Telegram. Первый раз кабинет создаётся сам, потом этот же вход его открывает.',
      google: 'Войти через Google',
      yandex: 'Войти через Яндекс',
      telegram: 'Войти через Telegram',
      telegramLocal: 'Telegram на этом адресе не входит. Кнопка появится, когда у бота в BotFather будет указан домен сайта.',
      connect: 'Подключить',
      logout: 'Выйти',
      delete: 'Удалить кабинет',
      deleteConfirm: 'Удалить кабинет и все сохранённые данные?',
      name: 'Имя',
      save: 'Сохранить',
      saved: 'Сохранено',
      unavailable: 'Сохранение временно недоступно. Разбор фото работает как раньше.',
      body: 'Мерки',
      bikes: 'Велосипеды',
      readings: 'Разборы',
      rider: 'Кто едет',
      riderLook: 'Вид кабинета следует за тем, кто едет. Младшая группа чуть круглее, юниоры резче, взрослые спокойнее.',
      theme: 'Тема',
      themeLight: 'Светлая',
      themeDark: 'Тёмная',
      cabinetLoading: 'Открываю кабинет…',
      child: 'Ребёнок',
      teen: 'Подросток',
      adult: 'Взрослый',
      height: 'Рост, см',
      inseam: 'Шов книгой, см',
      inseamHelp: 'Встань спиной к стене в обуви, в которой будешь кататься. Зажми книгу между ног, плотно к промежности, корешок горизонтально. Померяй от верхней грани книги до пола.',
      bikeName: 'Название',
      fit: 'Посадка',
      city: 'Городская',
      endurance: 'Универсальная',
      race: 'Гоночная',
      mtb: 'Горная',
      crank: 'Шатун, мм',
      saddle: 'Высота седла от каретки, мм',
      stem: 'Вынос, мм',
      drop: 'Падение руля, мм',
      measureHint: 'Как измерить',
      mmRange: {
        crank: 'Шатун — от 120 до 180 мм.',
        saddle: 'Высота седла — от 400 до 1000 мм.',
        stem: 'Вынос — от 30 до 150 мм.',
        drop: 'Падение руля — от −150 до 200 мм.',
      },
      mmCm: 'Если это сантиметры, напиши {mm}.',
      measures: {
        crank: {
          title: 'Шатун',
          text: 'Длина рычага от оси каретки до оси педали.',
          steps: [
            'Один конец рулетки — в центр болта, где сходятся шатуны.',
            'Второй — в центр оси педали.',
            'Меряй по прямой. Часто число уже написано на шатуне: 165, 170 или 172,5.',
          ],
        },
        saddle: {
          title: 'Высота седла',
          text: 'Прямая от оси каретки до верха седла.',
          steps: [
            'Рулетка от центра кареточного болта.',
            'До верхней поверхности седла, по его середине.',
            'Седло оставь так, как ездишь. Не до рельс и не вдоль подседельной трубы.',
          ],
        },
        stem: {
          title: 'Вынос',
          text: 'Расстояние между рулём и рулевой трубой.',
          steps: [
            'Один конец — центр хомута на рулевой трубе.',
            'Другой — центр хомута, который держит руль.',
            'По прямой между центрами. Число часто выбито на выносе: 80, 90, 100.',
          ],
        },
        drop: {
          title: 'Падение руля',
          text: 'Насколько руль ниже седла. Если руль выше — число с минусом.',
          steps: [
            'Велосипед стоит прямо. Замерь высоту верха седла от пола.',
            'Замерь высоту верха руля от пола, посередине руля.',
            'Из высоты седла вычти высоту руля. Руль выше седла — поставь минус.',
          ],
        },
      },
      bikeNote: 'Размеры сохранены. В разборе ролика вынос и шатуны участвуют в совете. Старые фото заново не пересчитываются.',
      addBike: 'Добавить велосипед',
      noBike: 'Без велосипеда',
      empty: 'Пока пусто',
      readingBack: 'К списку',
      readingToday: 'Это сегодняшние размеры и мерки. В день этого кадра они не сохранялись.',
      readingNone: 'В день кадра размеры не сохранялись.',
      readingMissing: 'не записано',
      remove: 'Удалить',
      studioTitle: 'Разборы людей',
      studioDenied: 'Этот экран для мастеров.',
      toAccount: 'В свой кабинет',
      saveReading: 'Сохранить в кабинет',
      pickBike: 'К какому велосипеду',
      error: 'Не получилось сохранить. Проверь числа и попробуй ещё раз.',
      limit: 'Лимит уже заполнен.',
      taken: 'Этот вход уже привязан к другому кабинету.',
      noEmail: 'Почта не пришла от входа',
    },
    pwa: {
      notice: 'На устройстве остаются углы, фото разбора и черновик записи. Если сайт закрыт паролем — ещё техническая куки входа. Рекламы и слежки нет.',
      noticeOk: 'Хорошо',
      install: 'Поставить',
      installAndroid: 'BikeTrue можно поставить на экран телефона или планшета — как обычное приложение.',
      installIos: 'Поставь BikeTrue на экран: «Поделиться», затем «На экран Домой».',
      later: 'Не сейчас',
      update: 'Есть новая версия BikeTrue.',
      updateGo: 'Обновить',
    },
    footer: 'BikeTrue — посадка, в которой хочется ехать.',
  },
  en: {
    metaTitle: 'BikeTrue — bike fit from a photo',
    metaDescription: 'Bike position from two side photos. Knee, back, arms, hip — then a hands-on fitting.',
    brand: 'BikeTrue',
    nav: { how: 'How to shoot', analyze: 'Analysis', visit: 'Consult', about: 'About', faq: 'FAQ', account: 'Account' },
    switchLabel: 'RU',
    home: {
      kicker: 'Bike fit from a photo',
      title: 'A position that makes you want to ride further',
      lead: 'Two side photos show where the bike is fighting you: knee, back, arms, hip. The rest we fine-tune in person.',
      primary: 'Analyze a photo',
      secondary: 'How to shoot',
      proof: ['2 side photos', '4 angles', 'No account needed'],
      sample: 'Sample reading',
      samplePoses: ['In the range', 'Saddle high', 'Saddle low', 'Too much reach', 'Too upright'],
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
      ctaPrimary: 'Write on Telegram',
      ctaSecondary: 'Photo first',
      supportTitle: 'Support BikeTrue',
      supportText: 'The frame check is free. Support keeps it open.',
      supportCustom: 'Other amount',
      supportButton: 'Support {amount} ₽',
      supportPending: 'The payment link is not connected yet.',
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
      film: 'A person aims a phone on a tripod at a bicycle from the side. The whole bike is on the screen.',
      meters: '3 m',
      camera: {
        title: 'Right side',
        text: 'The camera sees the chainring, lens at saddle height, about three metres away.',
      },
      frame: {
        title: 'Check the frame',
        checks: [
          { title: 'Whole silhouette', text: 'Bike and rider fully in frame. Close-fitting clothes.' },
          { title: 'Even light', text: 'No window behind you and no shadow across the knee.' },
          { title: 'One in frame', text: 'A second person throws off the reading. Helper stays behind the camera.' },
        ],
      },
      shots: {
        title: 'Two frames',
        down: { title: 'Crank down', text: 'Pedal at 6 o’clock, leg almost straight. This shows knee, back and arm.' },
        up: { title: 'Crank up', text: 'Same spot, pedal at 12 o’clock, foot still on the pedal. This frame is for the hip.' },
      },
      next: 'Next — read the photo',
    },
    analyze: {
      title: 'Analysis',
      lead: 'Upload a side photo or a short clip. Angles are computed here, and the file stays on your device.',
      bottom: 'Pedal down',
      top: 'Pedal up',
      bottomHint: 'Camera-side pedal at 6 o’clock, leg almost straight.',
      topOptional: 'Same spot, pedal at 12 o’clock. Optional — without it, no hip.',
      upload: 'Upload a photo',
      dropHere: 'or drop it here',
      example: 'Example',
      measures: 'We measure',
      notVisible: 'not visible in the frame',
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
      kept: 'Angles from your last analysis are on this device. The photo comes back if the browser still has it.',
      toVisit: 'Write on Telegram',
      browser: 'This screen needs a recent browser.',
      ghostNow: 'Now',
      ghostTarget: 'Target',
      ghostLegend: 'Amber is how you sit now. The white dashed line is where to aim.',
      ghostAllIn: 'Every angle is within the guide — nothing to move.',
      saveImage: 'Save image',
      saveVideo: 'Save video',
      recording: 'Recording…',
      photos: 'Two photos of the same position',
      videoTitle: 'Side clip',
      videoHint: 'Up to a minute on a trainer, a few pedal strokes. The lines are drawn here. The clip is not uploaded.',
      videoUpload: 'Upload a clip',
      videoReplace: 'Another clip',
      videoDrop: 'or drop it here',
      videoWorking: 'Reading frames on this device',
      videoLong: 'Longer than a minute: the first minute is read.',
      videoMinute: 'Longer than half a minute: the clip is read up to a minute, with frames a little further apart.',
      fitLead: 'The position comes first: a side clip and two photos of the same thing. The conclusion sits below. The overhead squat after that is a separate summary. It does not rewrite the position angles.',
      fitBikeOn: 'The advice uses “{name}”. Crank, stem and drop enter the sentence only when an angle is already outside the target. The degree does not change.',
      fitBikeOff: 'No bike is chosen yet. The advice follows the target, and the sizes stay out. Choose the bike below, where the reading is saved.',
      videoFloat: 'The angles drift by more than 4° during a stroke. Worth checking the fit in person.',
      bikeUse: 'Bike from your account',
      bikeSkip: 'No bike',
      bodyTitle: 'What your body can do',
      bodyHint: 'A tap sticks. “Easy” and “I can reach” keep the usual target. “With effort” and “I can’t” shift it. The degree from the clip is not rewritten.',
      gradeOn: 'Selected',
      gradeHold: 'Usual target.',
      gradeShift: 'Target shifted.',
      addBike: 'Add a bike',
      bikeDialog: 'New bike',
      bikeDialogLead: 'It stays in your account and applies to this reading right away.',
      bikeName: 'Name',
      bikeCrank: 'Crank, mm',
      bikeStem: 'Stem, mm',
      bikeSave: 'Save',
      bikeClose: 'Close',
      bikeNeedSignIn: 'Sign in to save a bike. The clip stays on this device and we bring you back here.',
      signInBack: 'Sign in and come back',
      bikeError: 'Couldn’t save. Check the name and the millimetres.',
      bikeLimit: 'Your account already has the maximum number of bikes.',
      subNote: 'Subscription: the overhead squat, what your body can do, and your own bike. There’s no checkout yet, so this block is open.',
      overheadTitle: 'Overhead squat',
      overheadHint: 'A squat with a stick, barefoot. Several clips are fine. Both sides are read, from the shin to the hand and the neck. This is an observation, not a diagnosis.',
      overheadFront: 'Front',
      overheadSide: 'Side',
      overheadUpload: 'Upload squats',
      overheadWorking: 'Finding the bottom',
      overheadKneesIn: 'At the bottom the knees are inside the ankles. That often comes from the foot or the hip.',
      overheadKneesOver: 'At the bottom the knees sit about over the ankles.',
      overheadKneesOut: 'At the bottom the knees are wider than the ankles.',
      overheadTorsoForward: 'The torso has gone forward of the shin.',
      overheadTorsoWith: 'The torso lean is close to the shin.',
      overheadTorsoUpright: 'The torso is more upright than the shin.',
      overheadUnseen: 'The joints didn’t come together at the bottom. The whole person needs to be in frame, squat all the way down.',
      overheadCompare: 'Knees are compared with the ankles, not the toes. Toes are not measured from the clip.',
      overheadHelpTitle: 'What the overhead squat is',
      overheadHelp: 'A squat with a stick overhead shows where the body does not reach: foot, hip, thoracic spine or shoulder. It is not a diagnosis. We do not film from behind: the joints are hidden.',
      overheadSteps: [
        'Barefoot, a stick or broom handle overhead, elbows straight.',
        'From the front: the phone at hip height, feet and the stick in frame.',
        'From the side: the whole person, squat to the lowest point.',
        'A clip up to a minute, or two photos: one from the front and one from the side, at the bottom.',
      ],
      overheadPhotos: 'Two photos',
      overheadClip: 'Clip',
      overheadFrontPhoto: 'Front photo',
      overheadSidePhoto: 'Side photo',
      overheadMany: 'Mark where each squat was filmed. Angles are not averaged.',
      overheadRun: 'Read',
      overheadAdd: 'Add clips',
      overheadKnee: 'Knee',
      overheadHip: 'Hip',
      overheadTorso: 'Torso',
      overheadShin: 'Shin',
      overheadArm: 'Arm',
      overheadNeck: 'Neck',
      overheadLeft: 'Left',
      overheadRight: 'Right',
      overheadSplit: 'Knee at the bottom is {a}° and {b}°. No average.',
      overheadBriefTitle: 'What this means for the bike',
      overheadNotRide: 'This is the squat, not the angle on the bike. It does not replace the position degree.',
      overheadNeckNote: 'The neck is two segments, not one. Left is ear–shoulder–hip, and right is the same. That shows which side is shorter. One shared angle would hide the side.',
      overheadSeat: 'On the bike the knee is {n}°. The squat does not change that number.',
      overheadStay: 'This goes on the person card in the account, not on a bike. The save button is below.',
      overheadFlagKneesIn: 'The knees are inside the ankles. On the bike that knee often points toward the frame. Stance and ankle come before saddle height.',
      overheadFlagKneesOver: 'The knees sit about over the ankles. That does not, by itself, carry over to the position angle.',
      overheadFlagKneesOut: 'The knees are wider than the ankles. On the bike the knee may open outward. Stance comes before the saddle.',
      overheadFlagShin: 'The shins differ by more than 8°. On the bike one leg may steer the knee differently.',
      overheadFlagNeck: 'The neck differs left to right by more than 8°. On the bike one shoulder is often lower.',
      overheadFlagArmsOpen: 'The arms overhead are nearly straight. The shoulder reaches in this test. Stem length is not the point here.',
      overheadFlagArmsShort: 'An arm bends overhead. Reaching the bar may be the shoulder, not only stem length.',
      overheadFlagHip: 'The hips stay nearly straight at the bottom — the squat did not get there. The depth reading is still weak.',
      stackTitle: 'How the reading stacks',
      stackCamera: 'The degree comes from the camera and is not rewritten. The body shifts the target. The bike changes the advice sentence only when an angle is already outside that target.',
      stackBike: 'Crank length explains a too-straight knee, stem length the arm, bar drop the torso lean. Saddle height is not turned into a degree: the knee angle checks it.',
      stackSaddle: 'Saddle height {mm} mm is saved. It is not converted into an angle.',
      stackAgree: '{label}: photo {a}° and clip {b}° agree.',
      stackSplit: '{label}: photo {a}°, clip {b}°. The gap is over 8°. The numbers do not stack — reshoot the frame where the person is harder to see.',
      stackPhoto: 'Photo',
      stackFilm: 'Clip',
      stackNamed: 'The sentences use “{name}”. Sizes enter only when an angle is already outside the target.',
      stackOpen: 'No bike is chosen. Sizes do not enter these sentences.',
      saveScope: 'The four angles go on the chosen bike. The overhead squat and the body grades go on the person card: one card for every bike. An empty block does not erase the card already saved.',
      factorTitle: 'What entered the calculation',
      factorLead: 'The degree from the camera does not change. A bike size changes the sentence only when an angle is already outside the target. “With effort” and “I can’t” move the target. “Easy” and “I can reach” leave it alone.',
      factorBike: 'Bike',
      factorBody: 'What the body can do',
      factorCrank: 'Crank',
      factorStem: 'Stem',
      factorDrop: 'Bar drop',
      factorSaddle: 'Saddle',
      factorMissing: '{label} is not saved. It stays out of the calculation.',
      factorQuiet: '{label} {mm} mm. {angle} {value}° is inside {min}–{max}°. The size stays quiet.',
      factorQuietEmpty: '{label} {mm} mm is saved. There is no angle yet, so the size stays quiet.',
      factorSpeaks: '{label} {mm} mm. {angle} {value}° is outside {min}–{max}°. The size enters the sentence. The degree stays {value}°.',
      factorSaddleLine: 'Saddle {mm} mm. It is not turned into a degree. Knee angle checks the height.',
      factorSaddleMissing: 'Saddle height is not saved. It would not become a degree anyway.',
      factorHold: '{label}: {grade}. The “{angle}” target stays {min}–{max}°.',
      factorShifts: '{label}: {grade}. The “{angle}” target becomes {min}–{max}° instead of {baseMin}–{baseMax}°.',
      factorBodySpeaks: '{label}: {grade}. The “{angle}” target is {min}–{max}°, and {value}° is against it. The sentence is about the body. The degree stays {value}°.',
      factorBodyMissing: '{label} is not marked. The “{angle}” target stays the usual {min}–{max}°.',
      gradeEasy: 'Easy',
      gradeReach: 'I can reach',
      gradeEffort: 'With effort',
      gradeCant: 'I can’t',
      bodyPosterior: 'Palms toward the floor, standing',
      bodyHip: 'Knee to chest, lying down',
      bodyAnkle: 'Knee toward the wall, heel down',
      bodyShoulder: 'Arms up, back to a wall',
      notes: {
        kneeCrank: 'Crank {mm} mm. A straight knee at the bottom can come from crank length, not only saddle height.',
        armStemLong: 'Stem {mm} mm. A straight arm often comes from a long stem.',
        armStemShort: 'Stem {mm} mm. A short stem bends the arm and can put weight on the hands.',
        backPosterior: 'Reaching the floor is hard. A low torso asks for posterior chain you don’t have. We don’t chase a lower back angle.',
        hipFlex: 'Knee to chest is hard. At the top of the pedal stroke we don’t close the hip.',
        kneeAnkle: 'The ankle doesn’t reach. We don’t straighten the knee any further at the bottom.',
        armShoulder: 'Arms overhead are hard. We don’t ask for a straight arm.',
        backDropFlat: 'Bar drop {mm} mm. A low torso can come from that drop.',
        backDropUp: 'Bar drop {mm} mm. The bar is barely below the saddle, so the torso stays upright.',
      },
    },
    visit: {
      title: 'A consultation',
      lead: 'Write what you want to look at. The message goes to Telegram. The day can stay empty.',
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
      send: 'Write on Telegram',
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
        { q: 'Where does the picture go?', a: 'Nowhere. The analysis runs in your browser; the photo never leaves your device. If you save a reading to your account, only the degrees go to the server, without the photo.' },
        { q: 'Why a second photo?', a: 'The hip angle only shows when the leg is up. One frame can’t measure it honestly.' },
      ],
    },
    privacy: {
      title: 'Privacy',
      paragraphs: [
        'The photo never leaves your device — the analysis runs in your browser.',
        'The latest angles, analysis photos, and booking draft stay on this device so you don’t start over. Clear them in the browser’s site data.',
        'If the site is password-locked, the browser keeps a sign-in cookie. There are no advertising or analytics cookies.',
        'From a booking we only get what you write yourself, and use it to get in touch.',
        'When you save, your name, the provider email, measurements, bike sizes and degrees go to the server. The photo stays on the device. The session cookie is set on the account host.',
      ],
    },
    account: {
      title: 'Account',
      leadOut: 'Sign in to save measurements, bikes and readings.',
      leadIn: 'Measurements, bikes and saved readings are here.',
      signin: 'Sign in',
      signinLead: 'Google, Yandex or Telegram. The first time a cabinet is created. After that the same sign-in opens it.',
      google: 'Sign in with Google',
      yandex: 'Sign in with Yandex',
      telegram: 'Sign in with Telegram',
      telegramLocal: 'Telegram will not sign in on this address. The button appears once the bot has the site domain in BotFather.',
      connect: 'Connect',
      logout: 'Sign out',
      delete: 'Delete account',
      deleteConfirm: 'Delete the account and all saved data?',
      name: 'Name',
      save: 'Save',
      saved: 'Saved',
      unavailable: 'Saving is temporarily unavailable. Photo analysis still works as before.',
      body: 'Measurements',
      bikes: 'Bikes',
      readings: 'Readings',
      rider: 'Who is riding',
      riderLook: 'The cabinet follows who is riding. Juniors are rounder, teens sharper, adults calmer.',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      cabinetLoading: 'Opening the cabinet…',
      child: 'Child',
      teen: 'Teen',
      adult: 'Adult',
      height: 'Height, cm',
      inseam: 'Book inseam, cm',
      inseamHelp: 'Stand with your back to the wall in the riding shoes you will use. Clamp a book between your legs, snug against the crotch, spine horizontal. Measure from the top edge of the book to the floor.',
      bikeName: 'Name',
      fit: 'Position',
      city: 'City',
      endurance: 'All-round',
      race: 'Race',
      mtb: 'Mountain',
      crank: 'Crank, mm',
      saddle: 'Saddle height from the bottom bracket, mm',
      stem: 'Stem, mm',
      drop: 'Bar drop, mm',
      measureHint: 'How to measure',
      mmRange: {
        crank: 'Crank is 120 to 180 mm.',
        saddle: 'Saddle height is 400 to 1000 mm.',
        stem: 'Stem is 30 to 150 mm.',
        drop: 'Bar drop is −150 to 200 mm.',
      },
      mmCm: 'If that was centimetres, write {mm}.',
      measures: {
        crank: {
          title: 'Crank',
          text: 'The arm from the bottom-bracket axle to the pedal axle.',
          steps: [
            'One end of the tape is the centre of the bolt where the cranks meet.',
            'The other is the centre of the pedal axle.',
            'Measure in a straight line. The number is often printed on the arm: 165, 170 or 172.5.',
          ],
        },
        saddle: {
          title: 'Saddle height',
          text: 'A straight line from the bottom-bracket axle to the top of the saddle.',
          steps: [
            'Start the tape at the centre of the bottom-bracket bolt.',
            'End at the top surface of the saddle, at its middle.',
            'Leave the saddle where you ride. Not the rails, and not along the seat tube.',
          ],
        },
        stem: {
          title: 'Stem',
          text: 'The distance between the bar and the steerer.',
          steps: [
            'One end is the centre of the clamp on the steerer tube.',
            'The other is the centre of the clamp that holds the bar.',
            'Straight between the centres. The number is often stamped on the stem: 80, 90, 100.',
          ],
        },
        drop: {
          title: 'Bar drop',
          text: 'How far the bar sits below the saddle. If the bar is higher, the number is negative.',
          steps: [
            'Bike upright. Measure the top of the saddle from the floor.',
            'Measure the top of the bar from the floor, at the middle of the bar.',
            'Subtract the bar height from the saddle height. Bar above the saddle — write a minus.',
          ],
        },
      },
      bikeNote: 'Sizes are saved. In a clip reading, stem and crank length join the advice. Older photos are not recalculated.',
      addBike: 'Add a bike',
      noBike: 'No bike',
      empty: 'Nothing here yet',
      readingBack: 'Back to the list',
      readingToday: 'These are today’s sizes and measurements. They were not saved with this frame.',
      readingNone: 'Sizes were not saved with this frame.',
      readingMissing: 'not recorded',
      remove: 'Delete',
      studioTitle: 'Readings of people',
      studioDenied: 'This screen is for fitters.',
      toAccount: 'To your account',
      saveReading: 'Save to account',
      pickBike: 'Which bike',
      error: 'Could not save. Check the numbers and try again.',
      limit: 'The limit is already full.',
      taken: 'This sign-in is already linked to another account.',
      noEmail: 'No email came from sign-in',
    },
    pwa: {
      notice: 'This device keeps your angles, analysis photos, and booking draft. A sign-in cookie is used only if the site is locked. No ads or tracking.',
      noticeOk: 'OK',
      install: 'Install',
      installAndroid: 'Install BikeTrue on your phone or tablet, like any other app.',
      installIos: 'Add BikeTrue to your Home Screen: Share, then Add to Home Screen.',
      later: 'Not now',
      update: 'A new version of BikeTrue is ready.',
      updateGo: 'Update',
    },
    footer: 'BikeTrue — a position you want to keep riding.',
  },
};
