use t::boilerplate;

use Test::More;

use_ok 'Web::Components';

{  package TestApp::Controller::Dummy;

   use Web::Simple;

   with 'Web::Components::Role';

   has '+moniker' => default => 'dummy';

   sub dispatch_request {
      sub (GET  + / + ?*) { [ 'dummy', 'get_index', @_ ] };
   }

   $INC{ 'TestApp/Controller/Dummy.pm' } = __FILE__;
}

{  package TestApp::Model;

   use Scalar::Util qw( blessed );
   use Web::Components::Util qw( throw );
   use Moo;

   sub execute {
      my ($self, $method, @args) = @_;

      $self->can( $method ) and return $self->$method( @args );

      throw 'Class [_1] has no method [_2]', [ blessed $self, $method ];
   }

   $INC{ 'TestApp/Model.pm' } = __FILE__;
}

{  package TestApp::Model::Dummy;

   use Moo;

   extends 'TestApp::Model';
   with    'Web::Components::Role';

   has '+moniker' => default => 'dummy';

   sub get_index {
      return [ 200, [ 'Content-Type', 'text/plain' ], [ '42' ] ];
   }

   $INC{ 'TestApp/Model/Dummy.pm' } = __FILE__;
}

{  package TestApp::Server;

   use Class::Usul;
   use Web::Simple;
   use Moo;

   has 'foo' => is => 'ro';

   has '_usul' => is => 'lazy', builder => sub {
      Class::Usul->new( config => { appclass => 'TestApp', tempdir => 't' } ) },
      handles  => [ 'config', 'debug', 'l10n', 'lock', 'log' ];

   with 'Web::Components::Loader';

   $INC{ 'TestApp/Server.pm' } = __FILE__;
}

my $env = {
   CONTENT_TYPE         => 'text/plain',
   HTTP_ACCEPT_LANGUAGE => 'en-gb,en;q=0.7,de;q=0.3',
   HTTP_HOST            => 'localhost:5000',
   PATH_INFO            => '/',
   QUERY_STRING         => 'key=124-4',
   REMOTE_ADDR          => '127.0.0.1',
   REQUEST_METHOD       => 'GET',
   SERVER_PROTOCOL      => 'HTTP/1.1',
   'psgix.logger'       => sub { warn $_[ 0 ]->{message}."\n" },
   'psgix.session'      => { authenticated => 1 },
};

my $server = TestApp::Server->new;

is $server->dispatch_request, 1, 'Default dispatch';
is $server->models->{dummy}->encoding, 'UTF-8', 'Sets encoding';
is $server->to_psgi_app->( $env )->[ 2 ]->[ 0 ], 42, 'Routes to method';
is $server->_action_suffix, '_action','Action suffix';

use Web::Components::Util qw( deref exception is_arrayref throw );

eval { throw 'Error' };

like exception(), qr{ Error }mx, 'Throws and catches';
is is_arrayref( [] ), 1, 'Is arrayref true';
is is_arrayref( ' ' ), 0, 'Is arrayref false';
is is_arrayref( 0 ), 0, 'Is arrayref false with false arg';
is deref( { test => 'dummy' }, 'test' ), 'dummy', 'Deref a hash with key';
is deref( {}, 'test', 'dummy' ), 'dummy', 'Deref a hash without key';
is deref( {}, 'test', '' ), '', 'Deref a hash without key false default';
is deref( $server, 'foo', 'bar' ), 'bar', 'Deref object with default';
is deref( $server, 'foo', '' ), '', 'Deref object with false default';

done_testing;

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
