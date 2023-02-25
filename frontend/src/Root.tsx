import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { withJsonRpcClient } from '@concordium/react-components';
import { WalletConnectionProps, WithWalletConnector } from '@concordium/react-components';
import { WalletConnectorButton } from './WalletConnectorButton';
import { ConnectedAccount } from './ConnectedAccount';
import { App } from './App';
import { NetworkSelector } from './NetworkSelector';
import { BROWSER_WALLET, MAINNET, TESTNET, WALLET_CONNECT } from './config';
import { errorString } from './util';
import { useConnection } from '@concordium/react-components';
import { useConnect } from '@concordium/react-components';

import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

export default function Root() {
    const [network, setNetwork] = useState(TESTNET);
    return (
        <Container>
            <WithWalletConnector network={TESTNET}>{(props) => <Main {...props} />}</WithWalletConnector>
        </Container>
    );
}

function Main(props: WalletConnectionProps) {
    const { activeConnectorType, activeConnector, activeConnectorError, network, connectedAccounts, genesisHashes } =
        props;
    const { connection, setConnection, account, genesisHash } = useConnection(connectedAccounts, genesisHashes);
    const { connect, isConnecting, connectError } = useConnect(activeConnector, setConnection);

    const [rpcGenesisHash, setRpcGenesisHash] = useState<string>();
    const [rpcError, setRpcError] = useState('');
    useEffect(() => {
        if (connection) {
            setRpcGenesisHash(undefined);
            withJsonRpcClient(connection, async (rpc) => {
                const status = await rpc.getConsensusStatus();
                return status.genesisBlock;
            })
                .then((hash) => {
                    setRpcGenesisHash(hash);
                    setRpcError('');
                })
                .catch((err) => {
                    setRpcGenesisHash(undefined);
                    setRpcError(errorString(err));
                });
        }
    }, [connection, genesisHash, network]);
    return (
        <>
        <Navbar bg="light" expand="lg">
            <Container fluid>
                <Navbar.Brand href="#">Donation Concordium</Navbar.Brand>
                <Navbar.Toggle aria-controls="navbarScroll" />
                <Navbar.Collapse id="navbarScroll">
                <Nav
                    className="me-auto my-2 my-lg-0"
                    style={{ maxHeight: '100px' }}
                    navbarScroll
                >
                </Nav>
                <Form className="d-flex">
                    <WalletConnectorButton
                        connectorType={BROWSER_WALLET}
                        connectorName="Connect Wallet"
                        connection={connection}
                        {...props}
                    />
                </Form>
                </Navbar.Collapse>
            </Container>
            </Navbar>
            <Row className="mt-3 mb-3">
                <Col>
                    {activeConnectorError && <Alert variant="danger">Connector error: {activeConnectorError}.</Alert>}
                    {!activeConnectorError && activeConnectorType && !activeConnector && <Spinner />}
                    {connectError && <Alert variant="danger">Connection error: {connectError}.</Alert>}
                    {activeConnector && !account && (
                        <Button type="button" onClick={connect} disabled={isConnecting}>
                            {isConnecting && 'Connecting...'}
                            {!isConnecting && activeConnectorType === BROWSER_WALLET && 'Connect Browser Wallet'}
                            {!isConnecting && activeConnectorType === WALLET_CONNECT && 'Connect Mobile Wallet'}
                        </Button>
                    )}
                </Col>
            </Row>
            <Row className="mt-3 mb-3">
                <Col>
                    <ConnectedAccount connection={connection} account={account} network={network} />
                </Col>
            </Row>
            <Row className="mt-3 mb-3">
                <Col>
                    {account && (
                        <NetworkInconsistencyReporter
                            rpcGenesisHash={rpcGenesisHash}
                            networkGenesisHash={network.genesisHash}
                            activeConnectionGenesisHash={genesisHash}
                        />
                    )}
                    {rpcError && <Alert variant="warning">RPC error: {rpcError}</Alert>}
                    <App network={network} connection={connection} connectedAccount={account} />
                </Col>
            </Row>
        </>
    );
}

interface NetworkInconsistencyReporterProps {
    rpcGenesisHash: string | undefined;
    activeConnectionGenesisHash: string | undefined;
    networkGenesisHash: string;
}

function NetworkInconsistencyReporter({
    rpcGenesisHash,
    networkGenesisHash,
    activeConnectionGenesisHash,
}: NetworkInconsistencyReporterProps) {
    const rpcMismatch = rpcGenesisHash && rpcGenesisHash !== networkGenesisHash;
    const activeConnectionMismatch = activeConnectionGenesisHash && activeConnectionGenesisHash !== networkGenesisHash;
    return (
        <>
            {(rpcMismatch || activeConnectionMismatch) && (
                <Alert variant="danger">
                    Inconsistent network parameters detected!
                    <ul>
                        <li>
                            Reported by wallet:{' '}
                            {(activeConnectionGenesisHash && <code>{activeConnectionGenesisHash}</code>) || <i>N/A</i>}.
                        </li>
                        <li>Fetched from via RPC: {(rpcGenesisHash && <code>{rpcGenesisHash}</code>) || <i>N/A</i>}</li>
                        <li>
                            Expected for selected network: <code>{networkGenesisHash}</code>
                        </li>
                    </ul>
                </Alert>
            )}
        </>
    );
}
