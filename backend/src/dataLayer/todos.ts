import * as AWS from "aws-sdk";
const AWSXRay = require("aws-xray-sdk");
import { TodoItem } from "../models/TodoItem";
import * as uuid from 'uuid';

import { CreateTodoRequest } from "../requests/CreateTodoRequest";
import { UpdateTodoRequest } from "../requests/UpdateTodoRequest";
import { createLogger } from '../utils/logger';


const logger = createLogger('todoAccess');

const bucketName = process.env.ATTACHMENT_S3_BUCKET;
const todoTable = process.env.TODOS_TABLE;
const createdAtIndex = process.env.TODOS_CREATED_AT_INDEX;
const urlExpiration = process.env.SIGNED_URL_EXPIRATION;

const XAWS = AWSXRay.captureAWS(AWS);

const s3 = new XAWS.S3({
  signatureVersion: 'v4'
});

const docClient = new XAWS.DynamoDB.DocumentClient();

export const getTodosForUser = async (userId: string): Promise<TodoItem[]> => {
    logger.info('Fetching all todos for userId', { userId: userId });

    const result = await docClient.query({
      TableName: todoTable,
      IndexName: createdAtIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

    const items = result.Items;

    return items as TodoItem[];
  }

export const createTodo = async(userId: string, newTodo: CreateTodoRequest) => {
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

    await docClient.put({
      TableName: todoTable,
      Item: newTodoWithAdditionalInfo
    }).promise();

    logger.info("Create complete.");

  return newTodoWithAdditionalInfo;

  }

export const deleteTodo = async (userId: string, todoId: string) => {
    logger.info("Deleting todo:", { todoId: todoId });
    await docClient.delete({
      TableName: todoTable,
      Key: {
        "todoId": todoId,
        "userId": userId
      }
    }).promise();
    logger.info("Delete complete.", { todoId: todoId });
  }

export const updateTodo = async (userId: string, todoId: string, updatedTodo: UpdateTodoRequest) => {

    logger.info("Updating todo:", {
      todoId: todoId,
      updatedTodo: updatedTodo
    });
    await docClient.update({
      TableName: todoTable,
      Key: {
        "todoId": todoId,
        "userId": userId
      },
      UpdateExpression: "set #todoName = :name, done = :done, dueDate = :dueDate",
      ExpressionAttributeNames: {
        "#todoName": "name"
      },
      ExpressionAttributeValues: {
        ":name": updatedTodo.name,
        ":done": updatedTodo.done,
        ":dueDate": updatedTodo.dueDate
      }
    }).promise();

    logger.info("Update complete.");

  }

export const updateAttachmentUrl = async (userId: string, todoId: string, attachmentUrl: string) => {
  logger.info(`Updating attachmentUrl ${attachmentUrl}`)

    await docClient.update({
      TableName: todoTable,
      Key: {
        "todoId": todoId,
        "userId": userId
      },
      UpdateExpression: "set attachmentUrl = :attachmentUrl",
      ExpressionAttributeValues: {
        ":attachmentUrl": `https://${bucketName}.s3.amazonaws.com/${attachmentUrl}`
      }
    }).promise();
  logger.info(`AttachmentUrl updated`)
  }


export const createAttachmentPresignedUrl = async (userId: string, todoId: string) => {
  const key = uuid.v4();
  logger.info("creating signed URL:", {
    todoId: todoId,
    attachmentId: key,
    urlExpiration,
  });
  const uploadUrl = s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: key,
    Expires: parseInt(urlExpiration)
  });

  await updateAttachmentUrl(userId, todoId, key);

  logger.info("sgned URL created:", uploadUrl);
  return uploadUrl;
}
