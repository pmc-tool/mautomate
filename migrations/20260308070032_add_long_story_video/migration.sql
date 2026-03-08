-- CreateTable
CREATE TABLE "StoryProject" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "targetDuration" INTEGER NOT NULL DEFAULT 60,
    "resolution" TEXT NOT NULL DEFAULT '720p',
    "voiceId" TEXT,
    "musicTrackId" TEXT,
    "musicMood" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "finalVideoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "referenceImageUrl" TEXT,

    CONSTRAINT "StoryProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryScene" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneIndex" INTEGER NOT NULL,
    "visualPrompt" TEXT NOT NULL,
    "narrationText" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "shotType" TEXT NOT NULL DEFAULT 'single',
    "transitionNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT,
    "videoUrl" TEXT,
    "narrationUrl" TEXT,
    "inputImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "errorMessage" TEXT,
    "creditsCost" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "userId" TEXT,

    CONSTRAINT "StoryScene_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StoryProject" ADD CONSTRAINT "StoryProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryScene" ADD CONSTRAINT "StoryScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StoryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryScene" ADD CONSTRAINT "StoryScene_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
