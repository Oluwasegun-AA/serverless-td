import { TodoItem } from "../models/TodoItem";
import * as uuid from 'uuid';

import { CreateTodoRequest } from "../requests/CreateTodoRequest";
import { UpdateTodoRequest } from "../requests/UpdateTodoRequest";
import { createLogger } from '../utils/logger';
import { createAttachmentPresignedUrlRecord, createTodoData, deleteTodoData, getTodosData, updateAttachmentUrlRecord, updateTodoData } from '../dataLayer/todosAccess';

const logger = createLogger('todoAccess');

export const getTodosForUser = async (userId: string): Promise<TodoItem[]> => {
  logger.info('Fetching all todos for userId', { userId: userId });

  return await getTodosData(userId);
};

export const createTodo = async (userId: string, newTodo: CreateTodoRequest) => {
  const todoId = uuid.v4();

  const newTodoWithAdditionalInfo = {
    userId: userId,
    todoId: todoId,
    createdAt: new Date().toISOString(),
    done: false,
    attachmentUrl: await createAttachmentPresignedUrl(userId, todoId),
    ...newTodo
  };

  logger.info("Creating new todo object:", newTodoWithAdditionalInfo);

  const response = await createTodoData(newTodoWithAdditionalInfo)

  logger.info("Create complete.");

  return response;

};

export const deleteTodo = async (userId: string, todoId: string) => {
  logger.info("Deleting todo:", { todoId: todoId });
  await deleteTodoData(userId, todoId)
  logger.info("Delete complete.", { todoId: todoId });
};

export const updateTodo = async (userId: string, todoId: string, updatedTodo: UpdateTodoRequest) => {

  logger.info("Updating todo:", {
    todoId: todoId,
    updatedTodo: updatedTodo
  });
  const record = {
    userId,
    todoId,
    ...updatedTodo
  }
  await updateTodoData(record);

  logger.info("Update complete.");

};

export const updateAttachmentUrl = async (userId: string, todoId: string, attachmentUrl: string) => {
  logger.info(`Updating attachmentUrl ${attachmentUrl}`);

  await updateAttachmentUrlRecord(userId, todoId, attachmentUrl);
  logger.info(`AttachmentUrl updated`);
};


export const createAttachmentPresignedUrl = async (userId: string, todoId: string) => {
  const key = uuid.v4();
  logger.info("creating signed URL:", {
    todoId: todoId,
    attachmentId: key,
  });

  const payload = {
    userId,
    todoId,
    key
  }
  const uploadUrl = await createAttachmentPresignedUrlRecord(payload)

  logger.info("sgned URL created:", uploadUrl);
  return uploadUrl;
};
