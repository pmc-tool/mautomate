const NOVITA_BASE_URL = "https://api.novita.ai/v3/async";

interface Txt2ImgParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps?: number;
  modelName: string;
}

interface SubmitResult {
  taskId: string;
}

interface TaskResult {
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  imageUrl?: string;
  errorMsg?: string;
}

export async function submitTxt2Img(
  apiKey: string,
  params: Txt2ImgParams
): Promise<SubmitResult> {
  const response = await fetch(`${NOVITA_BASE_URL}/txt2img`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      extra: {
        response_image_type: "png",
      },
      request: {
        model_name: params.modelName,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "",
        width: params.width,
        height: params.height,
        steps: params.steps || 20,
        image_num: 1,
        guidance_scale: 7.5,
        sampler_name: "Euler a",
        seed: -1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Novita API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return { taskId: data.task_id };
}

export async function checkTaskResult(
  apiKey: string,
  taskId: string
): Promise<TaskResult> {
  const response = await fetch(
    `${NOVITA_BASE_URL}/task-result?task_id=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Novita API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const taskStatus = (data.task?.status || "").toUpperCase();

  if (taskStatus === "TASK_STATUS_SUCCEED") {
    const imageUrl =
      data.images?.[0]?.image_url ||
      data.task?.result?.images?.[0]?.image_url ||
      data.images?.[0]?.nsfw_detection_result?.image_url;
    return { status: "COMPLETED", imageUrl };
  }

  if (taskStatus === "TASK_STATUS_FAILED") {
    return {
      status: "FAILED",
      errorMsg: data.task?.reason || "Image generation failed",
    };
  }

  // TASK_STATUS_QUEUED, TASK_STATUS_PROCESSING, etc.
  return { status: "PROCESSING" };
}
