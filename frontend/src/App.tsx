import { Network, WalletConnection, useContractSelector } from '@concordium/react-components';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { ContractDetails } from './ContractDetails';
import { ContractInvoker } from './ContractInvoker';



interface Props {
    network: Network;
    connection: WalletConnection | undefined;
    connectedAccount: string | undefined;
}

export function App({ network, connection, connectedAccount }: Props) {
    const contract = useContractSelector(connection?.getJsonRpcClient(), "3025");

    return (
        <>
            {connection && (
                <>
                    {contract.isLoading && <Spinner animation="border" />}
                    {contract.selected && (
                        <Container>
                            <Row>
                                <Col>
                                    <ContractDetails contract={contract.selected} />
                                </Col>
                                <Col>
                                    <ContractInvoker
                                        network={network}
                                        connection={connection}
                                        connectedAccount={connectedAccount}
                                        contract={contract.selected}
                                    />
                                </Col>
                            </Row>
                        </Container>
                    )}
                </>
            )}
        </>
    );
}
