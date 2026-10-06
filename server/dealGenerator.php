<?php
declare(strict_types=1);

const DEAL_GENERATOR_CATEGORY_ID = 32;
const DEAL_GENERATOR_STAGE_ID = 'C32:NEW';
const DEAL_GENERATOR_EVENT_ENTITY_TYPE_ID = 1052;
const DEAL_GENERATOR_AUDIENCE_LIST_ID = 216;
const DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD = 'UF_CRM_1753364407';
const DEAL_GENERATOR_BATCH_SIZE = 50;
const DEAL_GENERATOR_CHUNK_MAX = 20;

/**
 * @param array<string, mixed> $data
 */
function handleDealGeneratorRequest(array $data): void
{
    $action = (string)($data['action'] ?? '');

    switch ($action) {
        case 'dealGenerator.audience':
            handleDealGeneratorAudience();
            return;
        case 'dealGenerator.companies':
            handleDealGeneratorCompanies($data);
            return;
        case 'dealGenerator.generate':
            handleDealGeneratorGenerate($data);
            return;
        case 'dealGenerator.generateChunk':
            handleDealGeneratorGenerateChunk($data);
            return;
        default:
            throw new RuntimeException('Unknown dealGenerator action: ' . $action);
    }
}

function handleDealGeneratorAudience(): void
{
    // Inbound webhook не имеет прав на lists.element.get — список ЦА грузится на клиенте через BX24 SDK.
    sendSuccess([
        'items' => [],
        'total' => 0,
        'message' => 'Audience list must be loaded via BX24 SDK',
    ]);
}

/**
 * @param array<string, mixed> $data
 */
function handleDealGeneratorCompanies(array $data): void
{
    $audienceIds = normalizeIdList($data['audienceIds'] ?? []);
    if ($audienceIds === []) {
        sendSuccess(['items' => [], 'total' => 0]);
        return;
    }

    $result = callListMethod('crm.company.list', [
        'filter' => [
            DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD => $audienceIds,
        ],
        'select' => [
            'ID',
            'TITLE',
            DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD,
            'UF_CRM_1753364801',
        ],
    ], MAX_ITEMS_PER_REQUEST);

    sendSuccess([
        'items' => array_values($result['items']),
        'total' => $result['total'],
    ]);
}

/**
 * @param array<string, mixed> $data
 */
function handleDealGeneratorGenerateChunk(array $data): void
{
    $eventId = $data['eventId'] ?? null;
    if ($eventId === null || $eventId === '') {
        throw new RuntimeException('eventId is required');
    }

    $audienceIds = normalizeIdList($data['audienceIds'] ?? []);
    if ($audienceIds === []) {
        throw new RuntimeException('audienceIds is required');
    }

    $rawCompanies = $data['companies'] ?? null;
    if (!is_array($rawCompanies) || $rawCompanies === []) {
        sendSuccess([
            'createdDealIds' => [],
            'createdCount' => 0,
        ]);
        return;
    }

    if (count($rawCompanies) > DEAL_GENERATOR_CHUNK_MAX) {
        throw new RuntimeException('Chunk size exceeded: max ' . DEAL_GENERATOR_CHUNK_MAX . ' companies');
    }

    $authorId = resolveDealGeneratorAuthorId($data);
    $authorName = trim((string)($data['authorName'] ?? ''));
    $audienceNames = normalizeDealGeneratorAudienceNames($data);
    $finalize = !empty($data['finalize']);
    $userAuth = resolveDealGeneratorUserAuth($data);

    $companies = filterCompaniesByAudience(
        array_values(array_filter($rawCompanies, 'is_array')),
        $audienceIds,
    );

    if ($companies === []) {
        sendSuccess([
            'createdDealIds' => [],
            'createdCount' => 0,
        ]);
        return;
    }

    $event = loadDealGeneratorEvent($eventId);
    $createdDealIds = createDealsForCompanyChunk($companies, $event, $audienceIds, $authorId, $userAuth);

    if ($createdDealIds !== []) {
        $event = loadDealGeneratorEvent($eventId);
        appendDealGeneratorEventDeals($eventId, $event, $createdDealIds);
    }

    if ($finalize && $createdDealIds !== []) {
        addDealGeneratorTimelineComment(
            $eventId,
            $authorId,
            $authorName,
            $audienceNames,
        );
    }

    sendSuccess([
        'createdDealIds' => $createdDealIds,
        'createdCount' => count($createdDealIds),
    ]);
}

/**
 * @param array<string, mixed> $data
 */
function handleDealGeneratorGenerate(array $data): void
{
    $eventId = $data['eventId'] ?? null;
    if ($eventId === null || $eventId === '') {
        throw new RuntimeException('eventId is required');
    }

    $audienceIds = normalizeIdList($data['audienceIds'] ?? []);
    if ($audienceIds === []) {
        throw new RuntimeException('audienceIds is required');
    }

    $mode = (string)($data['mode'] ?? 'mass');
    $companyIds = normalizeIdList($data['companyIds'] ?? []);
    $authorId = resolveDealGeneratorAuthorId($data);
    $authorName = trim((string)($data['authorName'] ?? ''));
    $audienceNames = normalizeDealGeneratorAudienceNames($data);
    $userAuth = resolveDealGeneratorUserAuth($data);

    $event = loadDealGeneratorEvent($eventId);
    $companies = loadDealGeneratorCompanies($mode, $audienceIds, $companyIds);
    $companies = filterCompaniesByAudience($companies, $audienceIds);

    if ($companies === []) {
        sendSuccess([
            'createdDealIds' => [],
            'createdCount' => 0,
            'totalCompanies' => 0,
            'message' => 'Не найдено компаний для создания сделок',
        ]);
        return;
    }

    if ($authorId === null || $authorId === '') {
        throw new RuntimeException('Не удалось определить автора');
    }

    $createdDealIds = [];
    $companyChunks = array_chunk($companies, DEAL_GENERATOR_CHUNK_MAX);

    foreach ($companyChunks as $chunk) {
        $createdDealIds = array_merge(
            $createdDealIds,
            createDealsForCompanyChunk($chunk, $event, $audienceIds, $authorId, $userAuth),
        );
    }

    if ($createdDealIds !== []) {
        $event = loadDealGeneratorEvent($eventId);
        appendDealGeneratorEventDeals($eventId, $event, $createdDealIds);
        addDealGeneratorTimelineComment(
            $eventId,
            $authorId,
            $authorName,
            $audienceNames,
        );
    }

    sendSuccess([
        'createdDealIds' => $createdDealIds,
        'createdCount' => count($createdDealIds),
        'totalCompanies' => count($companies),
        'message' => count($createdDealIds) > 0
            ? 'Сделки успешно созданы'
            : 'Не найдено компаний для создания сделок',
    ]);
}

/**
 * @return array<string, mixed>
 */
function loadDealGeneratorEvent(string|int $eventId): array
{
    $response = callBitrixWithRateLimitRetry(static fn() => CRest::call('crm.item.get', [
        'entityTypeId' => DEAL_GENERATOR_EVENT_ENTITY_TYPE_ID,
        'id' => $eventId,
    ]));

    $item = $response['result']['item'] ?? $response['result'] ?? [];
    if (!is_array($item) || $item === []) {
        throw new RuntimeException('Мероприятие не найдено');
    }

    return $item;
}

/**
 * @param list<int|string> $audienceIds
 * @param list<int|string> $companyIds
 * @return list<array<string, mixed>>
 */
function loadDealGeneratorCompanies(string $mode, array $audienceIds, array $companyIds): array
{
    if ($mode === 'manual') {
        if ($companyIds === []) {
            return [];
        }

        $result = callListMethod('crm.company.list', [
            'filter' => ['ID' => $companyIds],
            'select' => ['ID', 'TITLE', DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD, 'UF_CRM_1753364801'],
        ], MAX_ITEMS_PER_REQUEST);

        return $result['items'];
    }

    $result = callListMethod('crm.company.list', [
        'filter' => [DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD => $audienceIds],
        'select' => ['ID', 'TITLE', DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD, 'UF_CRM_1753364801'],
    ], MAX_ITEMS_PER_REQUEST);

    return $result['items'];
}

/**
 * @param list<array<string, mixed>> $companies
 * @param list<int|string> $audienceIds
 * @return list<array<string, mixed>>
 */
function filterCompaniesByAudience(array $companies, array $audienceIds): array
{
    $selected = array_map('intval', $audienceIds);

    return array_values(array_filter($companies, static function (array $company) use ($selected): bool {
        $companyAudienceIds = getDealGeneratorCompanyAudienceIds($company);
        foreach ($companyAudienceIds as $id) {
            if (in_array($id, $selected, true)) {
                return true;
            }
        }
        return false;
    }));
}

/**
 * @param array<string, mixed> $company
 * @return list<int>
 */
function getDealGeneratorCompanyAudienceIds(array $company): array
{
    $raw = $company[DEAL_GENERATOR_COMPANY_AUDIENCE_FIELD] ?? null;
    if ($raw === null || $raw === '') {
        return [];
    }

    if (is_array($raw)) {
        return array_values(array_filter(array_map('intval', $raw)));
    }

    if (is_string($raw)) {
        return array_values(array_filter(array_map('intval', array_map('trim', explode(',', $raw)))));
    }

    $id = (int)$raw;
    return $id > 0 ? [$id] : [];
}

/**
 * @param list<array<string, mixed>> $companies
 * @param array<string, mixed> $event
 * @param list<int|string> $audienceIds
 * @return list<int|string>
 */
function createDealsForCompanyChunk(
    array $companies,
    array $event,
    array $audienceIds,
    string $authorId,
    array $userAuth,
): array {
    $createdDealIds = [];
    $companyIds = array_values(array_filter(array_map(
        static fn(array $company) => $company['ID'] ?? null,
        $companies,
    )));

    $contactGroups = fetchDealGeneratorCompanyContacts($companyIds);
    $contactResults = fetchDealGeneratorContactsForCompanies($contactGroups, $audienceIds);

    foreach ($companies as $index => $company) {
        $targetAudienceIds = intersectAudienceIds(getDealGeneratorCompanyAudienceIds($company), $audienceIds);
        if ($targetAudienceIds === []) {
            continue;
        }

        $contacts = $contactResults[$index] ?? [];
        $contactIds = array_values(array_filter(array_map(
            static fn(array $contact) => (int)($contact['ID'] ?? 0),
            is_array($contacts) ? $contacts : [],
        )));

        $fields = buildDealGeneratorDealFields(
            $company,
            $event,
            $authorId,
            $contactIds,
            $targetAudienceIds,
        );

        $response = callBitrixWithRateLimitRetry(static fn() => callBitrixMethodWithUserAuth('crm.deal.add', [
            'fields' => $fields,
        ], $userAuth));

        $dealId = $response['result'] ?? null;
        if ($dealId !== null && $dealId !== '' && $dealId !== false) {
            $createdDealIds[] = $dealId;
        }

        usleep(150000);
    }

    return $createdDealIds;
}

/**
 * @param array<string, mixed> $data
 * @return list<string>
 */
function normalizeDealGeneratorAudienceNames(array $data): array
{
    return array_values(array_filter(
        array_map('strval', is_array($data['audienceNames'] ?? null) ? $data['audienceNames'] : []),
        static fn(string $name) => $name !== '',
    ));
}

/**
 * @param array<string, mixed> $data
 */
function resolveDealGeneratorAuthorId(array $data): string
{
    $authorId = $data['authorId'] ?? null;
    if ($authorId === null || $authorId === '' || $authorId === 0 || $authorId === '0') {
        throw new RuntimeException('Не передан authorId текущего пользователя');
    }

    $normalized = (int)$authorId;
    if ($normalized <= 0) {
        throw new RuntimeException('Некорректный authorId');
    }

    return (string)$normalized;
}

/**
 * @param array<string, mixed> $data
 * @return array{domain: string, access_token: string}
 */
function resolveDealGeneratorUserAuth(array $data): array
{
    $auth = $data['auth'] ?? null;
    if (!is_array($auth)) {
        throw new RuntimeException('Не передан auth текущего пользователя');
    }

    $domain = trim((string)($auth['domain'] ?? ''));
    $accessToken = trim((string)($auth['access_token'] ?? $auth['accessToken'] ?? ''));

    if ($domain === '' || $accessToken === '') {
        throw new RuntimeException('Некорректный auth текущего пользователя');
    }

    $domain = preg_replace('#^https?://#i', '', $domain) ?? $domain;
    $domain = rtrim($domain, '/');

    return [
        'domain' => $domain,
        'access_token' => $accessToken,
    ];
}

/**
 * @param array{domain: string, access_token: string} $auth
 * @param array<string, mixed> $params
 * @return array<string, mixed>
 */
function callBitrixMethodWithUserAuth(string $method, array $params, array $auth): array
{
    $url = 'https://' . $auth['domain'] . '/rest/' . $method . '.json';
    $payload = array_merge($params, ['auth' => $auth['access_token']]);

    if (!function_exists('curl_init')) {
        throw new RuntimeException('cURL недоступен на сервере');
    }

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Не удалось инициализировать cURL');
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 60,
    ]);

    $rawResponse = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($rawResponse === false) {
        throw new RuntimeException('Bitrix API request failed: ' . $curlError);
    }

    $response = json_decode((string)$rawResponse, true);
    if (!is_array($response)) {
        throw new RuntimeException('Bitrix API returned invalid JSON (HTTP ' . $statusCode . ')');
    }

    return $response;
}

/**
 * @param list<int|string> $companyIds
 * @return list<list<array<string, mixed>>>
 */
function fetchDealGeneratorCompanyContacts(array $companyIds): array
{
    $resultData = [];

    foreach (array_chunk($companyIds, DEAL_GENERATOR_BATCH_SIZE) as $chunkIndex => $chunk) {
        $commands = [];
        foreach ($chunk as $localIndex => $companyId) {
            $commands['cmd' . $localIndex] = [
                'method' => 'crm.company.contact.items.get',
                'params' => ['id' => $companyId],
            ];
        }

        $batchResults = executeBatchCommands($commands);
        foreach ($chunk as $localIndex => $_companyId) {
            $resultData[] = extractItems($batchResults['cmd' . $localIndex] ?? []);
        }
    }

    return $resultData;
}

/**
 * @param list<list<array<string, mixed>>> $contactGroups
 * @param list<int|string> $audienceIds
 * @return list<list<array<string, mixed>>>
 */
function fetchDealGeneratorContactsForCompanies(array $contactGroups, array $audienceIds): array
{
    $results = array_fill(0, count($contactGroups), []);
    $jobs = [];

    foreach ($contactGroups as $index => $group) {
        if (!is_array($group) || $group === []) {
            continue;
        }

        $contactIds = array_values(array_filter(array_map(
            static fn(array $item) => $item['CONTACT_ID'] ?? $item['contactId'] ?? $item['ID'] ?? null,
            $group,
        )));

        if ($contactIds !== []) {
            $jobs[] = ['index' => $index, 'contactIds' => $contactIds];
        }
    }

    $lookupBatchSize = (int)floor(BITRIX_BATCH_COMMAND_LIMIT / 2);

    foreach (array_chunk($jobs, $lookupBatchSize) as $chunk) {
        $commands = [];

        foreach ($chunk as $localIndex => $job) {
            $commands['withAudience' . $localIndex] = [
                'method' => 'crm.contact.list',
                'params' => [
                    'filter' => [
                        'ID' => $job['contactIds'],
                        'UF_CRM_1753364801' => $audienceIds,
                    ],
                    'select' => ['ID'],
                ],
            ];

            $commands['withoutAudience' . $localIndex] = [
                'method' => 'crm.contact.list',
                'params' => [
                    'filter' => [
                        'ID' => $job['contactIds'],
                        '=UF_CRM_1753364801' => '',
                    ],
                    'select' => ['ID'],
                ],
            ];
        }

        if ($commands === []) {
            continue;
        }

        $batchResults = executeBatchCommands($commands);

        foreach ($chunk as $localIndex => $job) {
            $withAudience = extractItems($batchResults['withAudience' . $localIndex] ?? []);
            $withoutAudience = extractItems($batchResults['withoutAudience' . $localIndex] ?? []);
            $results[$job['index']] = array_merge($withAudience, $withoutAudience);
        }
    }

    return $results;
}

/**
 * @param array<string, mixed> $company
 * @param array<string, mixed> $event
 * @param list<int> $contactIds
 * @param list<int> $targetAudienceIds
 * @return array<string, mixed>
 */
function buildDealGeneratorDealFields(
    array $company,
    array $event,
    string $authorId,
    array $contactIds,
    array $targetAudienceIds,
): array {
    return [
        'TITLE' => $company['TITLE'] ?? ('Компания #' . ($company['ID'] ?? '')),
        'ASSIGNED_BY_ID' => (int)$authorId,
        'STAGE_ID' => DEAL_GENERATOR_STAGE_ID,
        'CATEGORY_ID' => (string)DEAL_GENERATOR_CATEGORY_ID,
        'CONTACT_IDS' => $contactIds !== [] ? $contactIds : null,
        'COMPANY_ID' => $company['ID'] ?? null,
        'UF_CRM_1742797326' => $event['id'] ?? $event['ID'] ?? null,
        'UF_CRM_1754290331' => $contactIds !== [] ? $contactIds : null,
        'UF_CRM_1755867109691' => $event['ufCrm38_1751875905992'] ?? null,
        'UF_CRM_1745308616558' => $event['ufCrm38_1745307580193'] ?? null,
        'UF_CRM_1755869361' => $event['ufCrm38_1753082280'] ?? null,
        'UF_CRM_1754897181' => $targetAudienceIds,
        'UF_CRM_1753365812' => $targetAudienceIds,
        'UF_CRM_1745308628574' => $event['ufCrm38_1745221903440'] ?? null,
        'UF_CRM_1745995876' => $event['ufCrm38_1750326807'] ?? null,
    ];
}

/**
 * @param list<int|string> $createdDealIds
 */
function appendDealGeneratorEventDeals(string|int $eventId, array $event, array $createdDealIds): void
{
    $startAddedDeals = (string)($event['ufCrm38AddedDeals'] ?? '');

    callBitrixWithRateLimitRetry(static fn() => CRest::call('crm.item.update', [
        'entityTypeId' => DEAL_GENERATOR_EVENT_ENTITY_TYPE_ID,
        'id' => $eventId,
        'fields' => [
            'ufCrm38_AddedDeals' => trim($startAddedDeals . ' / ' . implode(', ', array_map('strval', $createdDealIds)), ' /'),
        ],
    ]));
}

/**
 * @param list<string> $audienceNames
 */
function addDealGeneratorTimelineComment(
    string|int $eventId,
    string|int $authorId,
    string $authorName,
    array $audienceNames,
): void {
    $namesText = $audienceNames !== [] ? implode('", "', $audienceNames) : '—';
    $authorLabel = $authorName !== '' ? $authorName : ('ID ' . $authorId);

    callBitrixWithRateLimitRetry(static fn() => CRest::call('crm.timeline.comment.add', [
        'fields' => [
            'ENTITY_ID' => $eventId,
            'ENTITY_TYPE' => 'dynamic_1052',
            'COMMENT' => '✅ ' . $authorLabel . ' взял в работу ЦА: "' . $namesText . '"',
            'AUTHOR_ID' => $authorId,
        ],
    ]));
}

/**
 * @param array<string, mixed> $user
 */
function buildAuthorName(array $user): string
{
    return trim(implode(' ', array_filter([
        $user['LAST_NAME'] ?? '',
        $user['NAME'] ?? '',
        $user['SECOND_NAME'] ?? '',
    ])));
}

/**
 * @param mixed $value
 * @return list<int|string>
 */
function normalizeIdList($value): array
{
    if (!is_array($value)) {
        return $value === null || $value === '' ? [] : [(string)$value];
    }

    return array_values(array_filter(array_map(
        static fn($item) => is_scalar($item) ? (string)$item : '',
        $value,
    ), static fn(string $item) => $item !== ''));
}

/**
 * @param list<int> $companyAudienceIds
 * @param list<int|string> $selectedAudienceIds
 * @return list<int>
 */
function intersectAudienceIds(array $companyAudienceIds, array $selectedAudienceIds): array
{
    $selected = array_map('intval', $selectedAudienceIds);

    return array_values(array_filter(
        $companyAudienceIds,
        static fn(int $id) => in_array($id, $selected, true),
    ));
}
