param(
    [string]$Model = $env:CHUAN_MODEL,
    [string]$BaseUrl = $env:CHUAN_API_BASE_URL,
    [string]$ApiKey = $env:CHUAN_API_KEY
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://chuan.sylu.cc/v1' }
$BaseUrl = $BaseUrl.TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -match 'replace-with') {
    throw 'Set CHUAN_API_KEY before running this test.'
}
if ([string]::IsNullOrWhiteSpace($Model) -or $Model -match 'replace-with') {
    throw 'Set CHUAN_MODEL to an ID returned by GET /v1/models.'
}

$headers = @{ Authorization = "Bearer $ApiKey" }

function Invoke-ChuanJson {
    param(
        [string]$Uri,
        [ValidateSet('Get', 'Post')]
        [string]$Method,
        [byte[]]$Body
    )

    try {
        $params = @{
            Uri = $Uri
            Headers = $headers
            Method = $Method
            UseBasicParsing = $true
        }
        if ($Method -eq 'Post') {
            $params.ContentType = 'application/json; charset=utf-8'
            $params.Body = $Body
        }
        return Invoke-RestMethod @params
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'unknown' }
        $detail = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            try { $bodyText = $reader.ReadToEnd() } finally { $reader.Dispose() }
            if (-not [string]::IsNullOrWhiteSpace($bodyText)) { $detail = "$detail`n$bodyText" }
        }
        throw "Chuan API request failed ($status) [$Method $Uri]: $detail"
    }
}

$models = Invoke-ChuanJson -Uri "$BaseUrl/models" -Method Get
if (-not ($models.data.id -contains $Model)) {
    $available = @($models.data | ForEach-Object { $_.id }) -join ', '
    throw "Model '$Model' is not available for this account. Available models: $available"
}

$request = @{
    model = $Model
    messages = @(@{ role = 'user'; content = 'Reply with exactly: connection successful' })
    temperature = 0
    stream = $false
} | ConvertTo-Json -Depth 5

$response = Invoke-ChuanJson -Uri "$BaseUrl/chat/completions" -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($request))
if ($null -ne $response.code -and $response.code -ne 0) {
    throw "Chuan API returned an application error: $($response.msg)"
}
if ($null -eq $response.choices -or $response.choices.Count -eq 0 -or $null -eq $response.choices[0].message) {
    if ($null -ne $response.msg) {
        throw "Chuan API returned no chat completion: $($response.msg)"
    }
    throw 'Chuan API returned no chat completion. The configured gateway may not support this endpoint.'
}
[PSCustomObject]@{
    model = $response.model
    reply = $response.choices[0].message.content
    total_tokens = $response.usage.total_tokens
}