# sca-service-hpss

This service allows you to transfer files to/from HPSS and publish SCA progress events.

If you are running this on a machine behind firewall, you will need to set environment parameter `HPSS_BEHIND_FIREWALL`

## config.json

### Put files to hpss

Copy `localpath` to `hpsspath` while creating any missing parent directories on hpss.

```json
{
    "put": [
        { "localpath": "/etc/issue", "hpsspath": "test/issue.txt"},
        { "localpath": "/etc/hostname", "hpsspath": "test/hostname.txt"}
    ],
    "auth": {
        "username": "scauser1",   
        "keytab": "scauser1.keytab"
    }
}
```

### Get files from hpss

```json
{
    "get": [
        { "localdir": "/placeto/download", "hpsspath": "test/issue.txt"},
        { "localdir": "/placeto/download", "hpsspath": "test/hostname.txt"}
    ],
    "auth": {
        "username": "scauser1",   
        "keytab": "scauser1.keytab"
    }
}
```

### Remove files on hpss

```json
{
    "remove": [
        { "hpsspath": "test/issue.txt"},
        { "hpsspath": "test/hostname.txt"}
    ],
    "auth": {
        "username": "scauser1",   
        "keytab": "scauser1.keytab"
    }
}

```
