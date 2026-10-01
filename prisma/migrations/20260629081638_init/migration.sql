-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` VARCHAR(191) NULL,
    `refreshTokenExpires` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `handle` VARCHAR(191) NOT NULL,
    `quizPublicId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `settings` JSON NULL,

    UNIQUE INDEX `Category_quizPublicId_key`(`quizPublicId`),
    UNIQUE INDEX `Category_shopId_handle_key`(`shopId`, `handle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `text` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `productSelectionType` VARCHAR(191) NOT NULL DEFAULT 'single',
    `type` ENUM('RADIO', 'CHECKBOX', 'DROPDOWN', 'DROPDOWN_MULTI') NOT NULL,
    `options` JSON NOT NULL,
    `optionType` VARCHAR(191) NOT NULL DEFAULT 'text',
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuizSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `recommendations` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Answer` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NULL,
    `questionText` VARCHAR(191) NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `answer` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuizSettings` (
    `id` VARCHAR(191) NOT NULL,
    `shopId` VARCHAR(191) NOT NULL,
    `optionDisplayStyle` VARCHAR(191) NOT NULL DEFAULT 'default',
    `layoutDirection` VARCHAR(191) NOT NULL DEFAULT 'vertical',
    `imageSize` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `borderRadius` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `showQuestionNumbers` BOOLEAN NOT NULL DEFAULT true,
    `showProgressBar` BOOLEAN NOT NULL DEFAULT true,
    `autoScrollToNext` BOOLEAN NOT NULL DEFAULT false,
    `submitButtonText` VARCHAR(191) NOT NULL DEFAULT 'Submit Answers',
    `formHeading` VARCHAR(191) NOT NULL DEFAULT 'Take our Quiz!',
    `formSubheading` VARCHAR(191) NOT NULL DEFAULT 'Please enter your details to start',
    `showNameField` BOOLEAN NOT NULL DEFAULT true,
    `showEmailField` BOOLEAN NOT NULL DEFAULT true,
    `startButtonText` VARCHAR(191) NOT NULL DEFAULT 'Start Quiz',
    `formLayoutStyle` VARCHAR(191) NOT NULL DEFAULT 'centered',
    `formBackgroundStyle` VARCHAR(191) NOT NULL DEFAULT 'white',
    `inputFieldStyle` VARCHAR(191) NOT NULL DEFAULT 'rounded',
    `formBackgroundColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `formTextColor` VARCHAR(191) NOT NULL DEFAULT '#111111',
    `inputBorderColor` VARCHAR(191) NOT NULL DEFAULT '#dcdcdc',
    `inputFocusColor` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `startButtonBgColor` VARCHAR(191) NOT NULL DEFAULT '#000000',
    `startButtonTextColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `formWidth` VARCHAR(191) NOT NULL DEFAULT 'full',
    `buttonStyle` VARCHAR(191) NOT NULL DEFAULT 'solid',
    `quizDisplayMode` VARCHAR(191) NOT NULL DEFAULT 'step',
    `showBackButton` BOOLEAN NOT NULL DEFAULT true,
    `progressStyle` VARCHAR(191) NOT NULL DEFAULT 'line',
    `contentAlignment` VARCHAR(191) NOT NULL DEFAULT 'left',
    `maxSelections` INTEGER NOT NULL DEFAULT 0,
    `formPrimaryColor` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `formBorderRadius` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `formButtonStyle` VARCHAR(191) NOT NULL DEFAULT 'solid',
    `formContentAlignment` VARCHAR(191) NOT NULL DEFAULT 'left',
    `formOuterBorderRadius` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `quizBackgroundColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `quizTextColor` VARCHAR(191) NOT NULL DEFAULT '#111111',
    `quizPrimaryColor` VARCHAR(191) NOT NULL DEFAULT '#111827',
    `quizBorderRadius` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `quizContentAlignment` VARCHAR(191) NOT NULL DEFAULT 'left',
    `quizWidth` VARCHAR(191) NOT NULL DEFAULT 'full',
    `quizOuterBorderRadius` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `thankYouHeading` VARCHAR(191) NOT NULL DEFAULT 'Thank you for your answers!',
    `thankYouBody` VARCHAR(191) NOT NULL DEFAULT 'We will get back to you',
    `thankYouColor` VARCHAR(191) NOT NULL DEFAULT '#008060',
    `submitButtonBgColor` VARCHAR(191) NOT NULL DEFAULT '#000000',
    `customCss` VARCHAR(191) NULL DEFAULT '',
    `customJs` VARCHAR(191) NULL DEFAULT '',
    `embedUrl` VARCHAR(191) NULL,
    `hydrogenQuizId` VARCHAR(191) NULL,
    `registrationFormPosition` VARCHAR(191) NOT NULL DEFAULT 'before_quiz',
    `optionsPerRow` VARCHAR(191) NOT NULL DEFAULT '1',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `QuizSettings_shopId_key`(`shopId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `pendingPlan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlanSubscription_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizSubmission` ADD CONSTRAINT `QuizSubmission_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Answer` ADD CONSTRAINT `Answer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Answer` ADD CONSTRAINT `Answer_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `QuizSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
