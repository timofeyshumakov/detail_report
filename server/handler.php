<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/crest.php';
require_once __DIR__ . '/dealGenerator.php';

const BITRIX_BATCH_COMMAND_LIMIT = 50;
/** Сколько list-страниц класть в один batch. 50 crm.deal.list в одном batch
 *  почти всегда упирается в operation time limit и «висит» десятки секунд. */
const LIST_METHOD_BATCH_PAGES = 5;
const MAX_ITEMS_PER_REQUEST = 2500;
const DEFAULT_PAGE_SIZE = 50;
const RATE_LIMIT_RETRY_SECONDS = 60;
const OPERATION_TIME_RETRY_SECONDS = 120;

$latestBitrixTime = [];

/**
 * @return array<string, mixed>
 */
function readRequestPayload(): array
{
    $input = file_get_contents('php://input');
    if ($input === false || $input === '') {
        return [];
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('Invalid JSON input');
    }

    return is_array($data) ? $data : [];
}

function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

function sendSuccess(array $payload): void
{
    global $latestBitrixTime;

    sendJson(200, [
        'data' => $payload,
        'time' => $latestBitrixTime,
    ]);
}

function sendError(Throwable $error, int $statusCode = 500): void
{
    sendJson($statusCode, ['error' => $error->getMessage()]);
}

final class RateLimitException extends RuntimeException
{
}

final class OperationTimeLimitException extends RuntimeException
{
}

function rememberBitrixTime(array $response): void
{
    global $latestBitrixTime;

    if (!isset($response['time']) || !is_array($response['time'])) {
        return;
    }

    $time = $response['time'];
    $operating = (float)($time['operating'] ?? 0);
    $rememberedOperating = (float)($latestBitrixTime['operating'] ?? 0);

    // Один chunk вызывает разные методы. Возвращаем клиенту самый близкий
    // к лимиту метод, а не просто время последнего вызова.
    if ($latestBitrixTime === [] || $operating >= $rememberedOperating) {
        $latestBitrixTime = $time;
    }
}

function isOperationTimeLimitResponse(array $response): bool
{
    $code = strtoupper((string)($response['error'] ?? ''));
    $description = strtolower((string)($response['error_description'] ?? ''));

    return $code === 'OPERATION_TIME_LIMIT'
        || str_contains($description, 'method is blocked due to operation time limit')
        || str_contains($description, 'operation time limit');
}

function isRateLimitResponse(array $response): bool
{
    $code = strtoupper((string)($response['error'] ?? ''));
    $description = strtolower((string)($response['error_description'] ?? ''));

    return in_array($code, ['QUERY_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS'], true)
        || str_contains($description, 'query limit')
        || str_contains($description, 'too many requests')
        || str_contains($description, 'too many');
}

function sendRateLimitError(string $message = 'Превышен лимит запросов к Bitrix24. Повторите попытку через минуту.'): void
{
    sendJson(429, [
        'error' => $message,
        'code' => 'QUERY_LIMIT_EXCEEDED',
        'retryAfter' => RATE_LIMIT_RETRY_SECONDS,
    ]);
}

/**
 * @param array<string, mixed> $response
 */
function assertBitrixResponse(array $response, string $context = 'API'): array
{
    rememberBitrixTime($response);

    if (isset($response['error'])) {
        if (isOperationTimeLimitResponse($response)) {
            throw new OperationTimeLimitException(
                $response['error_description']
                ?? $response['error']
                ?? 'Method is blocked due to operation time limit.'
            );
        }

        if (isRateLimitResponse($response)) {
            throw new RateLimitException(
                $response['error_description']
                ?? $response['error']
                ?? 'QUERY_LIMIT_EXCEEDED'
            );
        }

        $message = $response['error_description'] ?? $response['error'] ?? 'Unknown error';
        throw new RuntimeException($context . ' error: ' . $message);
    }

    return $response;
}

/**
 * @param callable(): array<string, mixed> $callback
 * @return array<string, mixed>
 */
function callBitrixWithRateLimitRetry(callable $callback): array
{
    $attempts = 0;
    $maxAttempts = 3;

    while (true) {
        try {
            return assertBitrixResponse($callback());
        } catch (RateLimitException $error) {
            $attempts++;
            if ($attempts > $maxAttempts) {
                throw $error;
            }
            sleep(RATE_LIMIT_RETRY_SECONDS);
        }
    }
}

/**
 * @param mixed $data
 * @return list<mixed>
 */
function extractItems($data): array
{
    if (!is_array($data)) {
        return [];
    }

    if (isset($data['items']) && is_array($data['items'])) {
        return array_values($data['items']);
    }

    if ($data === []) {
        return [];
    }

    if (array_is_list($data)) {
        return $data;
    }

    // lists.element.get может вернуть ассоциативный массив { "123": {...}, ... }
    return array_values($data);
}

/**
 * @param array<string, mixed> $params
 * @return array{method: string, params: array<string, mixed>}
 */
function buildBatchCommand(string $method, array $params = []): array
{
    return [
        'method' => $method,
        'params' => $params,
    ];
}

/**
 * Разбор ответа batch REST:
 * { result: { result: {cmd: data}, result_error: {...}, result_total: {...} }, time: {...} }
 *
 * @param array<string, mixed> $response
 * @return array{
 *   results: array<string, mixed>,
 *   errors: array<string, array<string, mixed>>,
 *   totals: array<string, int>
 * }
 */
function extractBatchPayload(array $response): array
{
    $outer = $response['result'] ?? null;
    if (!is_array($outer)) {
        return ['results' => [], 'errors' => [], 'totals' => []];
    }

    // Нормальный ответ batch
    if (isset($outer['result']) && is_array($outer['result'])) {
        $errors = [];
        if (isset($outer['result_error']) && is_array($outer['result_error'])) {
            foreach ($outer['result_error'] as $key => $error) {
                if (is_array($error)) {
                    $errors[(string)$key] = $error;
                }
            }
        }

        $totals = [];
        if (isset($outer['result_total']) && is_array($outer['result_total'])) {
            foreach ($outer['result_total'] as $key => $total) {
                if (is_numeric($total)) {
                    $totals[(string)$key] = (int)$total;
                }
            }
        }

        return [
            'results' => $outer['result'],
            'errors' => $errors,
            'totals' => $totals,
        ];
    }

    // На всякий случай: result уже карта команд
    return ['results' => $outer, 'errors' => [], 'totals' => []];
}

/**
 * @param array<string, array{method?: string, params?: array<string, mixed>}|string> $commands
 * @return array<string, mixed>
 */
function executeBatchCommands(array $commands): array
{
    if ($commands === []) {
        return [];
    }

    if (count($commands) > MAX_ITEMS_PER_REQUEST) {
        throw new RuntimeException('Batch limit exceeded: max ' . MAX_ITEMS_PER_REQUEST . ' commands');
    }

    $prepared = [];
    foreach ($commands as $key => $command) {
        if (is_string($command)) {
            $prepared[(string)$key] = $command;
            continue;
        }

        if (!is_array($command) || empty($command['method']) || !is_string($command['method'])) {
            throw new RuntimeException('Invalid batch command: ' . (string)$key);
        }

        $params = isset($command['params']) && is_array($command['params']) ? $command['params'] : [];
        $prepared[(string)$key] = buildBatchCommand($command['method'], $params);
    }

    $results = [];
    foreach (array_chunk($prepared, BITRIX_BATCH_COMMAND_LIMIT, true) as $chunk) {
        $response = callBitrixWithRateLimitRetry(function () use ($chunk) {
            return CRest::callBatch($chunk);
        });

        if (!is_array($response)) {
            continue;
        }

        $payload = extractBatchPayload($response);

        foreach ($payload['errors'] as $key => $chunkError) {
            if (isOperationTimeLimitResponse($chunkError)) {
                throw new OperationTimeLimitException(
                    $chunkError['error_description']
                    ?? $chunkError['error']
                    ?? 'Method is blocked due to operation time limit.'
                );
            }
            if (isRateLimitResponse($chunkError)) {
                throw new RateLimitException(
                    $chunkError['error_description']
                    ?? $chunkError['error']
                    ?? 'QUERY_LIMIT_EXCEEDED'
                );
            }
            error_log('[executeBatchCommands] command error ' . $key . ': ' . ($chunkError['error_description'] ?? $chunkError['error'] ?? 'unknown'));
        }

        foreach ($payload['results'] as $key => $value) {
            $results[(string)$key] = $value;
        }
    }

    return $results;
}

/**
 * @param array<string, mixed> $data
 * @return array<string, mixed>
 */
function buildMethodParams(string $method, array $data): array
{
    if (isset($data['params']) && is_array($data['params'])) {
        return normalizeMethodParams($method, $data['params']);
    }

    $params = [];

    if (isset($data['filters']) && is_array($data['filters'])) {
        $params['filter'] = $data['filters'];
    }

    if (isset($data['filter']) && is_array($data['filter'])) {
        $params['filter'] = array_merge($params['filter'] ?? [], $data['filter']);
    }

    if (isset($data['select']) && is_array($data['select'])) {
        $params['select'] = $data['select'];
    }

    if (isset($data['order']) && is_array($data['order'])) {
        $params['order'] = $data['order'];
    }

    if (isset($data['start']) && is_numeric($data['start'])) {
        $params['start'] = (int)$data['start'];
    }

    if (isset($data['entityTypeId']) && is_numeric($data['entityTypeId'])) {
        $params['entityTypeId'] = (int)$data['entityTypeId'];
    }

    if (isset($data['id']) && (is_numeric($data['id']) || is_string($data['id']))) {
        $params['id'] = $data['id'];
    }

    if (isset($data['fields']) && is_array($data['fields'])) {
        $params['fields'] = $data['fields'];
    }

    // Для lists.element.get передаём IBLOCK_ID, IBLOCK_CODE и IBLOCK_TYPE_ID
    if ($method === 'lists.element.get') {
        //if (isset($data['iblock_code']) || isset($data['iblock_code'])) {
            $params['IBLOCK_ID'] = (int)($data['iblock_code'] ?? $data['IBLOCK_CODE']);
        //}

        if (isset($data['IBLOCK_TYPE_ID']) || isset($data['iblock_type_id'])) {
            $params['IBLOCK_TYPE_ID'] = 'lists';
        }
    }

    return normalizeMethodParams($method, $params);
}

/**
 * @param array<string, mixed> $params
 * @return array<string, mixed>
 */
function normalizeMethodParams(string $method, array $params): array
{
    if ($method !== 'user.get') {
        return $params;
    }

    if (isset($params['filter']) && is_array($params['filter'])) {
        $params['FILTER'] = $params['filter'];
        unset($params['filter']);
    }

    if (!isset($params['FILTER']) || !is_array($params['FILTER']) || $params['FILTER'] === []) {
        // Inbound webhook не может получить всех пользователей без фильтра.
        $params['FILTER'] = ['ACTIVE' => true, 'USER_TYPE' => 'employee'];
    }

    if (isset($params['select']) && is_array($params['select'])) {
        unset($params['select']);
    }

    return $params;
}

function isListMethod(string $method): bool
{
    return str_ends_with($method, '.list')
        || $method === 'lists.element.get'
        || $method === 'user.get';
}

/**
 * @param array<string, mixed> $params
 * @return array{items: list<mixed>, total: int}
 */
function callListMethod(string $method, array $params, int $maxItems): array
{
    $pageSize = DEFAULT_PAGE_SIZE;
    $baseStart = isset($params['start']) && is_numeric($params['start']) ? (int)$params['start'] : 0;
    if ($maxItems <= 1) {
        $maxItems = MAX_ITEMS_PER_REQUEST;
    } else {
        $maxItems = min($maxItems, MAX_ITEMS_PER_REQUEST);
    }

    $startedAt = microtime(true);
    error_log("[callListMethod] method=$method maxItems=$maxItems entityTypeId=" . ($params['entityTypeId'] ?? 'N/A') . " IBLOCK_CODE=" . ($params['IBLOCK_CODE'] ?? 'N/A'));

    // Стабильная сортировка обязательна для пагинации через start
    if (empty($params['order'])) {
        if ($method === 'crm.item.list') {
            $params['order'] = ['id' => 'ASC'];
        } elseif (
            $method === 'crm.deal.list'
            || $method === 'crm.company.list'
            || $method === 'crm.contact.list'
        ) {
            $params['order'] = ['ID' => 'ASC'];
        }
    }

    // select=[] / null не передаём — Bitrix отдаёт все поля, это сильно медленнее
    if (array_key_exists('select', $params) && (!is_array($params['select']) || $params['select'] === [])) {
        unset($params['select']);
    }

    $firstParams = $params;
    $firstParams['start'] = $baseStart;
    unset($firstParams['limit']);

    $firstResponse = callBitrixWithRateLimitRetry(function () use ($method, $firstParams) {
        return CRest::call($method, $firstParams);
    });
    $items = extractItems($firstResponse['result'] ?? []);
    $total = (int)($firstResponse['total'] ?? count($items));

    if (
        count($items) >= $maxItems
        || count($items) < $pageSize
        || ($baseStart + count($items)) >= $total
    ) {
        error_log(sprintf(
            '[callListMethod] done method=%s items=%d total=%d elapsed=%.2fs (single page)',
            $method,
            count($items),
            $total,
            microtime(true) - $startedAt
        ));
        return [
            'items' => array_slice($items, 0, $maxItems),
            'total' => $total,
        ];
    }

    $remaining = min($maxItems - count($items), max(0, $total - $baseStart - count($items)));
    $pagesNeeded = (int)ceil($remaining / $pageSize);

    if ($pagesNeeded <= 0) {
        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    // Страницы пачками по LIST_METHOD_BATCH_PAGES: быстрее и стабильнее, чем 50 list в одном batch.
    // CRest::callBatch кладёт params в query-строку команды — entityTypeId/filter/select доходят.
    for ($pageOffset = 1; $pageOffset <= $pagesNeeded; $pageOffset += LIST_METHOD_BATCH_PAGES) {
        if (count($items) >= $maxItems) {
            break;
        }

        $commands = [];
        $pageEnd = min($pageOffset + LIST_METHOD_BATCH_PAGES - 1, $pagesNeeded);
        for ($page = $pageOffset; $page <= $pageEnd; $page++) {
            $pageParams = $params;
            $pageParams['start'] = $baseStart + ($page * $pageSize);
            unset($pageParams['limit']);
            $commands['page_' . $page] = buildBatchCommand($method, $pageParams);
        }

        try {
            $batchResults = executeBatchCommands($commands);
        } catch (OperationTimeLimitException $error) {
            // Если batch упёрся в лимит — добираем оставшиеся страницы по одной
            error_log('[callListMethod] batch operation time limit, fallback to sequential from page ' . $pageOffset);
            $batchResults = [];
        }

        $emptyPage = false;
        for ($page = $pageOffset; $page <= $pageEnd; $page++) {
            $key = 'page_' . $page;
            $chunk = [];

            if (array_key_exists($key, $batchResults)) {
                $chunk = extractItems($batchResults[$key]);
            } else {
                // Нет результата в batch — прямой запрос этой страницы
                $pageParams = $params;
                $pageParams['start'] = $baseStart + ($page * $pageSize);
                unset($pageParams['limit']);
                $pageResponse = callBitrixWithRateLimitRetry(function () use ($method, $pageParams) {
                    return CRest::call($method, $pageParams);
                });
                $chunk = extractItems($pageResponse['result'] ?? []);
            }

            if ($chunk === []) {
                $emptyPage = true;
                break;
            }

            $items = array_merge($items, $chunk);

            if (count($chunk) < $pageSize || count($items) >= $maxItems) {
                $emptyPage = count($chunk) < $pageSize;
                break;
            }
        }

        if ($emptyPage || count($items) >= $maxItems) {
            break;
        }
    }

    $items = array_slice($items, 0, $maxItems);
    error_log(sprintf(
        '[callListMethod] done method=%s items=%d total=%d elapsed=%.2fs',
        $method,
        count($items),
        $total,
        microtime(true) - $startedAt
    ));

    return [
        'items' => $items,
        'total' => $total,
    ];
}

/**
 * @param array<string, mixed> $data
 */
function handleBatchRequest(array $data): void
{
    $commands = [];

    if (isset($data['cmd']) && is_array($data['cmd'])) {
        $commands = $data['cmd'];
    } elseif (isset($data['commands']) && is_array($data['commands'])) {
        $commands = $data['commands'];
    } elseif (isset($data['batch']) && is_array($data['batch'])) {
        $commands = $data['batch'];
    }

    if ($commands === []) {
        throw new RuntimeException('Batch commands are required');
    }

    sendSuccess([
        'result' => executeBatchCommands($commands),
    ]);
}

/**
 * @param array<string, mixed> $data
 */
function handleSingleRequest(array $data): void
{
    if (!isset($data['method']) || !is_string($data['method']) || $data['method'] === '') {
        throw new RuntimeException('Method is required and must be a non-empty string');
    }

    $method = $data['method'];
    $params = buildMethodParams($method, $data);

    if ($method === 'crm.dealcategory.stage.list' && isset($params['entityTypeId'])) {
        $params['id'] = $params['entityTypeId'];
        unset($params['entityTypeId']);
    }

    $requestedLimit = DEFAULT_PAGE_SIZE;
    if (isset($data['limit']) && is_numeric($data['limit'])) {
        $requestedLimit = (int)$data['limit'];
    }

    // Для crm.item.list, lists.element.get, user.get и crm.deal/company/contact.list всегда используем полную пагинацию
    $forcePagination = ($method === 'crm.item.list' && isset($data['entityTypeId']))
        || ($method === 'lists.element.get' && isset($data['IBLOCK_CODE']))
        || ($method === 'user.get')
        || str_starts_with($method, 'crm.deal.list')
        || str_starts_with($method, 'crm.company.list')
        || str_starts_with($method, 'crm.contact.list');
    $effectiveLimit = $forcePagination ? MAX_ITEMS_PER_REQUEST : $requestedLimit;

    if (isListMethod($method) && ($requestedLimit > DEFAULT_PAGE_SIZE || $forcePagination)) {
        $result = callListMethod($method, $params, $effectiveLimit);
        sendSuccess([
            'data' => $result['items'],
            'total' => $result['total'],
        ]);
    }

    $response = callBitrixWithRateLimitRetry(function () use ($method, $params) {
        return CRest::call($method, $params);
    });
    $items = extractItems($response['result'] ?? []);
    $total = (int)($response['total'] ?? count($items));

    sendSuccess([
        'data' => $items,
        'total' => $total,
    ]);
}

try {
    $data = readRequestPayload();
    $action = (string)($data['action'] ?? '');

    if ($action !== '' && str_starts_with($action, 'dealGenerator.')) {
        handleDealGeneratorRequest($data);
    }

    $isBatchRequest = !empty($data['batch'])
        || !empty($data['cmd'])
        || !empty($data['commands'])
        || (($data['mode'] ?? '') === 'batch');

    if ($isBatchRequest) {
        handleBatchRequest($data);
    }

    handleSingleRequest($data);
} catch (RateLimitException $error) {
    sendRateLimitError(
        'Превышен лимит запросов к Bitrix24. Повторите попытку через минуту.'
    );
} catch (OperationTimeLimitException $error) {
    sendJson(429, [
        'error' => $error->getMessage(),
        'code' => 'OPERATION_TIME_LIMIT',
        'retryAfter' => OPERATION_TIME_RETRY_SECONDS,
        'time' => $latestBitrixTime,
    ]);
} catch (Throwable $error) {
    sendError($error);
}
