import * as AWS from "aws-sdk";
const AWSXRay = require("aws-xray-sdk");
import { TodoItem } from "../models/TodoItem";

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

export const getTodosData = async (userId: string): Promise<TodoItem[]> => {
    const result = await docClient.query({
      TableName: todoTable,
      IndexName: createdAtIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

  const items = result.Items;

  logger.info('todos fetched', { userId: userId });

    return items as TodoItem[];
  }

export const createTodoData = async(newTodo: CreateTodoRequest) => {

    await docClient.put({
      TableName: todoTable,
      Item: newTodo
    }).promise();

    logger.info("Create complete.");

  return newTodo;

  }

export const deleteTodoData = async (userId: string, todoId: string) => {
    await docClient.delete({
      TableName: todoTable,
      Key: {
        "todoId": todoId,
        "userId": userId
      }
    }).promise();
    logger.info("Delete complete.", { todoId: todoId });
  }

export const updateTodoData = async (updatedTodo: UpdateTodoRequest & { todoId: string, userId:string }) => {
  // eslint-disable-next-line
  const { todoId, userId, name, done, dueDate} = updatedTodo;

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
        ":name": name,
        ":done": done,
        ":dueDate": dueDate
      }
    }).promise();

    logger.info("Update complete.");

  }

export const updateAttachmentUrlRecord = async (userId: string, todoId: string, attachmentUrl: string) => {

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


export const createAttachmentPresignedUrlRecord = async (payload) => {
  const uploadUrl = s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: payload.key,
    Expires: urlExpiration
  });

  await updateAttachmentUrlRecord(payload.userId, payload.todoId, payload.key);

  logger.info("sgned URL created:", uploadUrl);
  return uploadUrl;
}
